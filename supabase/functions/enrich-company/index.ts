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
    // Auth check: require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    console.log("Enrichment requested by user:", userId);

    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get company info
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, domain, sector")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      console.error("Company not found:", companyError);
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{
      source_url: string;
      source_name: string;
      data_type: string;
      title: string | null;
      summary: string | null;
      confidence_score: string;
    }> = [];

    // 1. Scrape company website if domain exists
    const isValidPublicDomain = (domain: string): boolean => {
      const full = domain.startsWith('http') ? domain : `https://${domain}`;
      try {
        const parsed = new URL(full);
        const h = parsed.hostname;
        if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1') return false;
        if (h.startsWith('10.') || h.startsWith('192.168.') || h.startsWith('169.254.')) return false;
        if (h.startsWith('172.')) {
          const second = parseInt(h.split('.')[1]);
          if (second >= 16 && second <= 31) return false;
        }
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch { return false; }
    };

    if (company.domain && isValidPublicDomain(company.domain)) {
      const url = company.domain.startsWith("http")
        ? company.domain
        : `https://${company.domain}`;

      console.log("Scraping company website:", url);
      try {
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown", "summary"],
            onlyMainContent: true,
          }),
        });

        const scrapeData = await scrapeRes.json();
        if (scrapeRes.ok && scrapeData.success) {
          const content = scrapeData.data?.markdown || scrapeData.markdown;
          const summary = scrapeData.data?.summary || scrapeData.summary;
          const title =
            scrapeData.data?.metadata?.title || scrapeData.metadata?.title;

          results.push({
            source_url: url,
            source_name: "company_website",
            data_type: "website",
            title: title || company.name,
            summary: summary || (content ? content.substring(0, 500) : null),
            confidence_score: "high",
          });
        }
      } catch (e) {
        console.error("Website scrape failed:", e);
      }
    }

    // 2. Search for recent news
    console.log("Searching for news about:", company.name);
    try {
      const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `${company.name} ${company.sector || ""} funding news 2025 2026`,
          limit: 5,
          tbs: "qdr:m",
        }),
      });

      const searchData = await searchRes.json();
      if (searchRes.ok && searchData.success && searchData.data) {
        for (const result of searchData.data) {
          results.push({
            source_url: result.url,
            source_name: "web_search",
            data_type: "news",
            title: result.title || null,
            summary: result.description || null,
            confidence_score: "medium",
          });
        }
      }
    } catch (e) {
      console.error("News search failed:", e);
    }

    // 3. Store all enrichment results
    if (results.length > 0) {
      const enrichments = results.map((r) => ({
        company_id: companyId,
        ...r,
        scraped_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from("company_enrichments")
        .insert(enrichments);

      if (insertError) {
        console.error("Failed to store enrichments:", insertError);
      }
    }

    console.log(`Enrichment complete: ${results.length} items for ${company.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        enriched: results.length,
        items: results.map((r) => ({
          source: r.source_name,
          title: r.title,
          confidence: r.confidence_score,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Enrichment error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
