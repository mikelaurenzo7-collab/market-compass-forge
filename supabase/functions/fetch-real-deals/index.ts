import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Fetches real M&A and deal transactions from Financial Modeling Prep (FMP) API.
 * Uses the existing FMP_API_KEY secret.
 * FMP provides real M&A data via /api/v4/mergers-acquisitions-rss-feed
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    if (!FMP_API_KEY) {
      return new Response(
        JSON.stringify({ error: "FMP_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const page = body.page ?? 0;

    // Use the stable endpoint for latest M&A data
    const maUrl = `https://financialmodelingprep.com/stable/mergers-acquisitions-latest?page=${page}&apikey=${FMP_API_KEY}`;
    console.log("Fetching from:", maUrl.replace(FMP_API_KEY, "***"));
    const maResp = await fetch(maUrl);

    if (!maResp.ok) {
      const errText = await maResp.text();
      console.error("FMP M&A error:", maResp.status, errText);
      return new Response(
        JSON.stringify({ error: `FMP API error: ${maResp.status}`, detail: errText.slice(0, 200) }),
        { status: maResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deals = await maResp.json();
    return await processDeals(supabase, deals);
  } catch (err) {
    console.error("fetch-real-deals error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processDeals(supabase: any, rawDeals: any[]) {
  if (!Array.isArray(rawDeals) || rawDeals.length === 0) {
    return new Response(
      JSON.stringify({ message: "No deals found", processed: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`Processing ${rawDeals.length} real M&A deals...`);

  const inserts = rawDeals.slice(0, 50).map((d: any) => ({
    target_company: d.targetedCompanyName || d.companyName || d.title || "Unknown",
    acquirer_investor: d.acquirerCompanyName || d.acquirer || null,
    deal_type: "M&A",
    deal_value: d.transactionValue ? parseFloat(d.transactionValue) : d.dealSize ? parseFloat(d.dealSize) : null,
    announced_date: d.announcedDate || d.publishedDate || d.date || null,
    status: d.status || "announced",
    target_industry: d.targetedCompanyIndustry || d.sector || null,
    source: "Financial Modeling Prep",
    source_type: "api",
    source_url: d.url || d.link || null,
    is_synthetic: false,
    confidence_score: "high",
    verification_status: "verified",
    fetched_at: new Date().toISOString(),
  }));

  // Filter out entries we might already have (by target_company + announced_date)
  let inserted = 0;
  const errors: string[] = [];

  for (const deal of inserts) {
    if (!deal.target_company || deal.target_company === "Unknown") continue;

    // Check if this deal already exists
    const { data: existing } = await supabase
      .from("deal_transactions")
      .select("id")
      .eq("target_company", deal.target_company)
      .eq("announced_date", deal.announced_date)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const { error: insertErr } = await supabase
      .from("deal_transactions")
      .insert(deal);

    if (insertErr) {
      errors.push(`${deal.target_company}: ${insertErr.message}`);
    } else {
      inserted++;
    }
  }

  console.log(`Inserted ${inserted} new real M&A deals`);

  return new Response(
    JSON.stringify({
      processed: rawDeals.length,
      inserted,
      errors: errors.slice(0, 5),
      message: `Imported ${inserted} real M&A deals from FMP`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
