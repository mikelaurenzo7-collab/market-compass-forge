import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEC_USER_AGENT = "Grapevine contact@grapevine.io";
const SEC_BASE = "https://data.sec.gov";

function padCIK(cik: string): string {
  return cik.replace(/^0+/, "").padStart(10, "0");
}

async function fetchSEC(path: string) {
  const res = await fetch(`${SEC_BASE}${path}`, {
    headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`SEC API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize ?? 10;
    const limit = body.limit ?? 100; // Process up to 100 companies per invocation

    // Get public companies that have CIK numbers and haven't been fetched recently
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
    const { data: companies, error: fetchErr } = await supabase
      .from("companies")
      .select("id, name, cik_number")
      .eq("market_type", "public")
      .not("cik_number", "is", null)
      .or(`last_sec_fetch.is.null,last_sec_fetch.lt.${cutoff}`)
      .order("name")
      .limit(limit);

    if (fetchErr) throw fetchErr;
    if (!companies?.length) {
      return new Response(JSON.stringify({ message: "No companies need SEC refresh", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetConcepts = [
      "Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax",
      "NetIncomeLoss", "Assets", "EarningsPerShareBasic",
      "OperatingIncomeLoss", "GrossProfit", "StockholdersEquity",
      "LongTermDebt", "CashAndCashEquivalentsAtCarryingValue",
    ];

    let processed = 0;
    let totalFacts = 0;
    const errors: string[] = [];

    // Process in batches to respect SEC rate limit (10 req/sec)
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (company) => {
          const paddedCIK = padCIK(company.cik_number!);
          const factsData = await fetchSEC(`/api/xbrl/companyfacts/CIK${paddedCIK}.json`);
          if (!factsData) return { companyId: company.id, facts: 0 };

          const usGaap = factsData?.facts?.["us-gaap"] ?? {};
          const rows: any[] = [];

          for (const concept of targetConcepts) {
            const conceptData = usGaap[concept];
            if (!conceptData) continue;

            const units = conceptData.units?.USD ?? conceptData.units?.[Object.keys(conceptData.units)[0]];
            if (!units?.length) continue;

            // Last 10 annual + 8 quarterly
            const annualFacts = units
              .filter((u: any) => u.form === "10-K" && u.end)
              .sort((a: any, b: any) => b.end.localeCompare(a.end))
              .slice(0, 10);
            const quarterlyFacts = units
              .filter((u: any) => u.form === "10-Q" && u.end)
              .sort((a: any, b: any) => b.end.localeCompare(a.end))
              .slice(0, 8);

            for (const fact of [...annualFacts, ...quarterlyFacts]) {
              rows.push({
                company_id: company.id,
                cik_number: paddedCIK,
                taxonomy: "us-gaap",
                concept,
                period_start: fact.start || null,
                period_end: fact.end,
                value: fact.val,
                unit: "USD",
                form_type: fact.form,
                filed_date: fact.filed || null,
              });
            }
          }

          // Deduplicate: SEC can return multiple entries for same concept/period
          const deduped = new Map<string, any>();
          for (const row of rows) {
            const key = `${row.cik_number}|${row.concept}|${row.period_end}|${row.unit}|${row.form_type}`;
            deduped.set(key, row); // Last one wins
          }
          const uniqueRows = Array.from(deduped.values());

          if (uniqueRows.length > 0) {
            for (let j = 0; j < uniqueRows.length; j += 100) {
              const chunk = uniqueRows.slice(j, j + 100);
              const { error: upsertErr } = await supabase.from("sec_financial_facts").upsert(chunk, {
                onConflict: "cik_number,concept,period_end,unit,form_type",
                ignoreDuplicates: false,
              });
              if (upsertErr) {
                throw new Error(`Upsert failed: ${upsertErr.message}`);
              }
            }
          }

          // Update last_sec_fetch timestamp
          await supabase.from("companies").update({ last_sec_fetch: new Date().toISOString() }).eq("id", company.id);

          return { companyId: company.id, facts: uniqueRows.length };
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          processed++;
          totalFacts += r.value.facts;
        } else {
          errors.push(r.reason?.message ?? "Unknown error");
        }
      }

      // Respect SEC rate limit: wait 1.5s between batches
      if (i + batchSize < companies.length) {
        await sleep(1500);
      }
    }

    // Refresh materialized views after ingestion
    await supabase.rpc("refresh_materialized_views");

    return new Response(JSON.stringify({
      processed,
      totalFacts,
      errors: errors.slice(0, 10),
      message: `Ingested ${totalFacts} financial facts for ${processed} companies`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("bulk-sec-ingest error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
