import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEC_USER_AGENT = "Grapevine contact@grapevine.io";
const SEC_BASE = "https://data.sec.gov";

async function fetchSEC(path: string) {
  const res = await fetch(`${SEC_BASE}${path}`, {
    headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`SEC API ${res.status}: ${res.statusText}`);
  return res.json();
}

function padCIK(cik: string): string {
  return cik.replace(/^0+/, "").padStart(10, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { companyId, cik, action } = await req.json();
    if (!companyId || !cik) {
      return new Response(JSON.stringify({ error: "companyId and cik required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const paddedCIK = padCIK(cik);

    if (action === "financials" || action === "all") {
      // Fetch XBRL financial facts
      const factsData = await fetchSEC(`/api/xbrl/companyfacts/CIK${paddedCIK}.json`);
      const usGaap = factsData?.facts?.["us-gaap"] ?? {};
      
      const targetConcepts = [
        "Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax",
        "NetIncomeLoss", "Assets", "EarningsPerShareBasic",
        "OperatingIncomeLoss", "GrossProfit", "StockholdersEquity",
        "LongTermDebt", "CashAndCashEquivalentsAtCarryingValue",
      ];

      const rows: any[] = [];
      for (const concept of targetConcepts) {
        const conceptData = usGaap[concept];
        if (!conceptData) continue;
        
        // Prefer USD units
        const units = conceptData.units?.USD ?? conceptData.units?.[Object.keys(conceptData.units)[0]];
        if (!units?.length) continue;

        // Get annual filings (10-K) — last 10 years
        const annualFacts = units
          .filter((u: any) => u.form === "10-K" && u.end)
          .sort((a: any, b: any) => b.end.localeCompare(a.end))
          .slice(0, 10);

        // Also get recent quarterly (10-Q) — last 8 quarters
        const quarterlyFacts = units
          .filter((u: any) => u.form === "10-Q" && u.end)
          .sort((a: any, b: any) => b.end.localeCompare(a.end))
          .slice(0, 8);

        for (const fact of [...annualFacts, ...quarterlyFacts]) {
          rows.push({
            company_id: companyId,
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

      if (rows.length > 0) {
        // Upsert in batches of 100
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          await supabase.from("sec_financial_facts").upsert(batch, {
            onConflict: "cik_number,concept,period_end,unit,form_type",
            ignoreDuplicates: false,
          });
        }
      }
    }

    if (action === "filings" || action === "all") {
      // Fetch filing submissions
      const subData = await fetchSEC(`/submissions/CIK${paddedCIK}.json`);
      const recent = subData?.filings?.recent;
      if (recent) {
        const filingRows: any[] = [];
        const count = Math.min(recent.accessionNumber?.length ?? 0, 50);

        for (let i = 0; i < count; i++) {
          const accNum = recent.accessionNumber[i];
          const formType = recent.form[i];
          // Only store key filing types
          if (!["10-K", "10-Q", "8-K", "S-1", "DEF 14A", "SC 13D", "SC 13G", "4", "13F-HR"].includes(formType)) continue;

          const accNumFormatted = accNum.replace(/-/g, "");
          const primaryDoc = recent.primaryDocument?.[i];
          const docUrl = primaryDoc
            ? `https://www.sec.gov/Archives/edgar/data/${cik}/${accNumFormatted}/${primaryDoc}`
            : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${paddedCIK}&type=${formType}`;

          filingRows.push({
            company_id: companyId,
            cik_number: paddedCIK,
            accession_number: accNum,
            filing_type: formType,
            filing_date: recent.filingDate[i],
            description: recent.primaryDocDescription?.[i] || formType,
            primary_document_url: docUrl,
          });
        }

        if (filingRows.length > 0) {
          await supabase.from("sec_filings").upsert(filingRows, {
            onConflict: "cik_number,accession_number",
            ignoreDuplicates: false,
          });
        }
      }

      // Also update the companies table with CIK
      await supabase.from("companies").update({ cik_number: paddedCIK }).eq("id", companyId);
    }

    return new Response(JSON.stringify({ success: true, cik: paddedCIK }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fetch-sec-filings error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
