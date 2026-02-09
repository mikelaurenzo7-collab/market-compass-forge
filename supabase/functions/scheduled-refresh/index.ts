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
    // Auth: only allow service-role or anon key (for cron)
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    if (token !== serviceKey && token !== anonKey) {
      return new Response(JSON.stringify({ error: "Unauthorized - service key required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Scheduled refresh started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pick 5 companies that haven't been enriched in 7+ days (or never)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get companies with old/no enrichments
    const { data: allCompanies } = await supabase
      .from("companies")
      .select("id, name")
      .limit(200);

    if (!allCompanies || allCompanies.length === 0) {
      return new Response(JSON.stringify({ message: "No companies to refresh" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: recentEnrichments } = await supabase
      .from("company_enrichments")
      .select("company_id")
      .gte("scraped_at", sevenDaysAgo);

    const recentlyEnrichedIds = new Set((recentEnrichments ?? []).map((e) => e.company_id));
    const staleCompanies = allCompanies.filter((c) => !recentlyEnrichedIds.has(c.id));

    // Shuffle and pick 5
    const shuffled = staleCompanies.sort(() => Math.random() - 0.5);
    const toRefresh = shuffled.slice(0, 5);

    console.log(`Refreshing ${toRefresh.length} companies:`, toRefresh.map((c) => c.name));

    let enrichedCount = 0;

    for (const company of toRefresh) {
      try {
        const enrichRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/enrich-company`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ companyId: company.id }),
          }
        );

        if (enrichRes.ok) {
          enrichedCount++;
          console.log(`Enriched: ${company.name}`);
        } else {
          const errText = await enrichRes.text();
          console.error(`Failed to enrich ${company.name}:`, errText);
        }
      } catch (e) {
        console.error(`Error enriching ${company.name}:`, e);
      }
    }

    // Insert activity event so dashboard timestamp updates
    await supabase.from("activity_events").insert({
      event_type: "system",
      headline: `Data refresh completed: ${enrichedCount} companies updated`,
      detail: `Automated daily refresh enriched ${toRefresh.map((c) => c.name).join(", ")}`,
      published_at: new Date().toISOString(),
    });

    console.log(`Scheduled refresh complete: ${enrichedCount}/${toRefresh.length} enriched`);

    return new Response(
      JSON.stringify({
        success: true,
        refreshed: enrichedCount,
        companies: toRefresh.map((c) => c.name),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scheduled refresh error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
