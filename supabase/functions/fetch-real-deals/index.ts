import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Fetch latest M&A from FMP
    const maUrl = `https://financialmodelingprep.com/stable/mergers-acquisitions-latest?apikey=${FMP_API_KEY}`;
    const maResp = await fetch(maUrl);

    if (!maResp.ok) {
      const errText = await maResp.text();
      console.error("FMP error:", maResp.status, errText.slice(0, 300));
      return new Response(
        JSON.stringify({ error: `FMP API error: ${maResp.status}` }),
        { status: maResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawDeals = await maResp.json();
    
    // Log the first deal's structure for debugging
    if (Array.isArray(rawDeals) && rawDeals.length > 0) {
      console.log("FMP deal sample keys:", Object.keys(rawDeals[0]));
      console.log("FMP deal sample:", JSON.stringify(rawDeals[0]).slice(0, 500));
    }

    if (!Array.isArray(rawDeals) || rawDeals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No deals found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let inserted = 0;
    const errors: string[] = [];
    const sampleMapped: any[] = [];

    for (const d of rawDeals) {
      // Map FMP fields dynamically (they use various naming conventions)
      const targetCompany = d.targetedCompanyName || d.targetCompanyName || d.companyName || d.symbol || d.title || null;
      const acquirer = d.acquirerCompanyName || d.acquirerName || d.acquirer || null;
      const dealValue = parseFloat(d.transactionValue || d.dealSize || d.price || "0") || null;
      const announcedDate = d.transactionDate || d.announcedDate || d.acceptedDate || d.filedDate || d.date || null;
      const industry = d.targetedCompanyIndustry || d.industry || d.sector || null;
      const sourceUrl = d.url || d.link || d.secLink || null;

      if (!targetCompany) continue;

      // Deduplicate
      const { data: existing } = await supabase
        .from("deal_transactions")
        .select("id")
        .eq("target_company", targetCompany)
        .eq("source", "Financial Modeling Prep")
        .limit(1);

      if (existing && existing.length > 0) continue;

      const deal = {
        target_company: targetCompany,
        acquirer_investor: acquirer,
        deal_type: "M&A",
        deal_value: dealValue,
        announced_date: announcedDate,
        status: "announced",
        target_industry: industry,
        source: "Financial Modeling Prep",
        source_type: "api",
        source_url: sourceUrl,
        is_synthetic: false,
        confidence_score: "high",
        verification_status: "verified",
        fetched_at: new Date().toISOString(),
      };

      if (sampleMapped.length < 3) sampleMapped.push(deal);

      const { error: insertErr } = await supabase
        .from("deal_transactions")
        .insert(deal);

      if (insertErr) {
        errors.push(`${targetCompany}: ${insertErr.message}`);
      } else {
        inserted++;
      }
    }

    console.log(`Inserted ${inserted} real deals`);

    return new Response(
      JSON.stringify({
        processed: rawDeals.length,
        inserted,
        sample: sampleMapped,
        errors: errors.slice(0, 5),
        message: `Imported ${inserted} real M&A deals from FMP`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-real-deals error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
