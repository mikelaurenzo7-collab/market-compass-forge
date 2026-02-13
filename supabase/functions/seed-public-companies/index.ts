import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch SEC company tickers - this is the canonical list of all US public companies
    const secRes = await fetch(
      "https://www.sec.gov/files/company_tickers.json",
      {
        headers: {
          "User-Agent": "Grapevine contact@grapevine.io",
          Accept: "application/json",
        },
      }
    );

    if (!secRes.ok) {
      throw new Error(`SEC API returned ${secRes.status}`);
    }

    const secData = await secRes.json();

    // SEC returns { "0": { cik_str, ticker, title }, "1": ... }
    const entries = Object.values(secData) as Array<{
      cik_str: number;
      ticker: string;
      title: string;
    }>;

    console.log(`Fetched ${entries.length} companies from SEC`);

    // Get existing public companies to avoid duplicates
    const { data: existing } = await supabase
      .from("companies")
      .select("cik_number")
      .eq("market_type", "public")
      .not("cik_number", "is", null);

    const existingCiks = new Set(
      (existing ?? []).map((c: any) => c.cik_number)
    );

    // Map SEC sectors via SIC code prefix (basic mapping)
    const sectorFromTitle = (title: string): string => {
      const t = title.toUpperCase();
      if (
        t.includes("PHARMACEUTICAL") ||
        t.includes("BIOTECH") ||
        t.includes("MEDICAL")
      )
        return "Healthcare";
      if (t.includes("BANK") || t.includes("FINANCIAL") || t.includes("INSUR"))
        return "Financial Services";
      if (
        t.includes("SOFTWARE") ||
        t.includes("TECH") ||
        t.includes("COMPUTER")
      )
        return "Enterprise SaaS";
      if (t.includes("OIL") || t.includes("GAS") || t.includes("ENERGY"))
        return "Climate Tech";
      if (t.includes("RETAIL") || t.includes("CONSUMER")) return "Consumer";
      if (
        t.includes("REAL ESTATE") ||
        t.includes("REIT") ||
        t.includes("PROPERTY")
      )
        return "Real Estate";
      if (t.includes("MANUFACT") || t.includes("INDUSTRIAL"))
        return "Manufacturing";
      if (t.includes("FOOD") || t.includes("RESTAURANT"))
        return "Restaurant";
      if (t.includes("CONSTRUCT")) return "Construction";
      if (t.includes("DEFENSE") || t.includes("AERO")) return "Defense Tech";
      if (t.includes("TELECOM") || t.includes("COMMUN"))
        return "Infrastructure";
      return "Services";
    };

    // Prepare new companies for insert
    const newCompanies = entries
      .filter((e) => {
        const cik = String(e.cik_str).padStart(10, "0");
        return !existingCiks.has(cik);
      })
      .map((e) => {
        const cik = String(e.cik_str).padStart(10, "0");
        // Title case the company name
        const name = e.title
          .split(" ")
          .map(
            (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          )
          .join(" ")
          .replace(/\b(Inc|Corp|Ltd|Llc|Lp|Co)\b/gi, (m: string) =>
            m.toUpperCase()
          );

        return {
          name,
          cik_number: cik,
          market_type: "public",
          sector: sectorFromTitle(e.title),
          status: "active",
        };
      });

    console.log(
      `${newCompanies.length} new companies to insert (${existingCiks.size} already exist)`
    );

    // Also create public_market_data entries for tickers
    const tickerMap = new Map<string, string>(); // cik -> ticker

    entries.forEach((e) => {
      const cik = String(e.cik_str).padStart(10, "0");
      tickerMap.set(cik, e.ticker);
    });

    // Batch insert companies (500 at a time)
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < newCompanies.length; i += BATCH) {
      const batch = newCompanies.slice(i, i + BATCH);
      const { error } = await supabase.from("companies").insert(batch);
      if (error) {
        console.error(`Batch ${i / BATCH} error:`, error.message);
        // Continue with next batch
      } else {
        inserted += batch.length;
      }
    }

    // Now create public_market_data for all public companies that have tickers
    const { data: publicCompanies } = await supabase
      .from("companies")
      .select("id, cik_number")
      .eq("market_type", "public")
      .not("cik_number", "is", null);

    if (publicCompanies) {
      // Get existing market data
      const { data: existingMarketData } = await supabase
        .from("public_market_data")
        .select("company_id");

      const existingMarketIds = new Set(
        (existingMarketData ?? []).map((m: any) => m.company_id)
      );

      const newMarketData = publicCompanies
        .filter((c: any) => !existingMarketIds.has(c.id) && tickerMap.has(c.cik_number))
        .map((c: any) => ({
          company_id: c.id,
          ticker: tickerMap.get(c.cik_number)!,
        }));

      // Batch insert market data
      for (let i = 0; i < newMarketData.length; i += BATCH) {
        const batch = newMarketData.slice(i, i + BATCH);
        const { error } = await supabase
          .from("public_market_data")
          .insert(batch);
        if (error) {
          console.error(`Market data batch error:`, error.message);
        }
      }

      console.log(`Created ${newMarketData.length} market data entries`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_sec_companies: entries.length,
        already_existed: existingCiks.size,
        newly_inserted: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
