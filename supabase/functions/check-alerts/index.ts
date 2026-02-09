import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from("user_alerts")
      .select("*")
      .eq("is_active", true);

    if (alertsError) throw alertsError;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ message: "No active alerts", matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent activity events (last 24 hours)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: events } = await supabase
      .from("activity_events")
      .select("*, companies(name, sector, stage)")
      .gte("published_at", since)
      .order("published_at", { ascending: false });

    // Get recent funding rounds (last 24 hours)
    const { data: rounds } = await supabase
      .from("funding_rounds")
      .select("*, companies:company_id(name, sector)")
      .gte("created_at", since);

    let matchCount = 0;
    const notifications: any[] = [];

    for (const alert of alerts) {
      const conditions = alert.conditions as {
        sector?: string;
        round_type?: string;
        min_amount?: number;
        event_type?: string;
        keywords?: string[];
      };

      // Check funding rounds against alert conditions
      for (const round of (rounds ?? [])) {
        let match = true;
        const company = (round as any).companies;

        if (conditions.sector && company?.sector?.toLowerCase() !== conditions.sector.toLowerCase()) match = false;
        if (conditions.round_type && !round.round_type.toLowerCase().includes(conditions.round_type.toLowerCase())) match = false;
        if (conditions.min_amount && (round.amount ?? 0) < conditions.min_amount) match = false;

        if (match) {
          notifications.push({
            user_id: alert.user_id,
            alert_id: alert.id,
            company_id: round.company_id,
            title: `${company?.name ?? 'Unknown'} raised ${round.round_type}${round.amount ? ` ($${(round.amount / 1e6).toFixed(0)}M)` : ''}`,
            detail: `Alert "${alert.name}" triggered: ${company?.name} completed a ${round.round_type} round.`,
          });
          matchCount++;
        }
      }

      // Check activity events
      for (const event of (events ?? [])) {
        let match = false;
        const company = (event as any).companies;

        if (conditions.event_type && event.event_type.toLowerCase() === conditions.event_type.toLowerCase()) match = true;
        if (conditions.sector && company?.sector?.toLowerCase() === conditions.sector.toLowerCase()) match = true;
        if (conditions.keywords?.some((kw: string) => event.headline.toLowerCase().includes(kw.toLowerCase()))) match = true;

        if (match) {
          notifications.push({
            user_id: alert.user_id,
            alert_id: alert.id,
            company_id: event.company_id,
            title: event.headline,
            detail: `Alert "${alert.name}" triggered.`,
          });
          matchCount++;
        }
      }
    }

    // Insert notifications (deduplicate by alert_id + company_id)
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("alert_notifications")
        .insert(notifications);
      if (insertError) console.error("Insert notification error:", insertError);
    }

    return new Response(JSON.stringify({ message: `Checked ${alerts.length} alerts`, matched: matchCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-alerts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
