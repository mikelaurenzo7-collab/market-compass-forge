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

  const start = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Refresh all materialized views (includes mv_company_scores now)
    const { error } = await supabase.rpc("refresh_materialized_views");
    if (error) throw error;

    // Clean up old rate limit windows (> 1 hour old)
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supabase.from("rate_limits").delete().lt("window_start", cutoff);

    // Clean up old telemetry (> 30 days)
    const telemetryCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("api_telemetry").delete().lt("created_at", telemetryCutoff);

    const latencyMs = Date.now() - start;

    // Record own telemetry
    await supabase.from("api_telemetry").insert({
      function_name: "refresh-views", method: "POST", status_code: 200,
      latency_ms: latencyMs,
      metadata: { cleaned_rate_limits: true, cleaned_telemetry: true },
    });

    console.log(`Materialized views refreshed in ${latencyMs}ms (incl. mv_company_scores)`);
    return new Response(JSON.stringify({
      success: true,
      refreshed_at: new Date().toISOString(),
      latency_ms: latencyMs,
      views_refreshed: ["mv_dashboard_summary", "mv_sector_multiples", "mv_company_scores"],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const latencyMs = Date.now() - start;
    console.error("Refresh views error:", error);

    // Record error telemetry (best-effort)
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabase.from("api_telemetry").insert({
        function_name: "refresh-views", method: "POST", status_code: 500,
        latency_ms: latencyMs, error_message: error instanceof Error ? error.message : "Unknown",
      });
    } catch (_) {}

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
