import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check: accept valid JWT OR service-role key (for cron invocations)
    const authHeader = req.headers.get("Authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // If it's the anon key, validate as user JWT
    if (token !== serviceKey && token !== anonKey) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("check-alerts called by user:", claimsData.claims.sub);
    } else {
      console.log("check-alerts called by service/cron");
    }

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

    // Get recent distressed asset changes (last 24 hours)
    const { data: newDistressed } = await supabase
      .from("distressed_assets")
      .select("*")
      .gte("created_at", since);

    // Get recent CRE market data changes
    const { data: recentCRE } = await supabase
      .from("cre_market_data")
      .select("*")
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
        occupancy_threshold?: number;
        caprate_spread?: number;
      };
      const alertModule = (alert as any).module ?? "general";

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

      // Module-specific: distressed alerts (auction_event, covenant_breach, distressed_new)
      if (alertModule === "distressed") {
        for (const asset of (newDistressed ?? [])) {
          let match = false;
          const aType = (alert as any).alert_type;

          if (aType === "distressed_new") match = true;
          if (aType === "auction_event" && asset.legal_stage === "chapter_7") match = true;
          if (aType === "covenant_breach" && asset.distress_type === "covenant_breach") match = true;
          if (conditions.sector && asset.sector?.toLowerCase() !== conditions.sector?.toLowerCase()) match = false;
          if (conditions.min_amount && (asset.asking_price ?? 0) > conditions.min_amount) match = false;

          if (match) {
            notifications.push({
              user_id: alert.user_id,
              alert_id: alert.id,
              company_id: null,
              title: `Distressed: ${asset.name} (${asset.distress_type?.replace("_", " ")})`,
              detail: `Alert "${alert.name}" triggered for ${asset.name} in ${asset.location_state ?? "Unknown"}.`,
            });
            matchCount++;
          }
        }
      }

      // Module-specific: real_estate alerts (occupancy_drop, caprate_shift)
      if (alertModule === "real_estate") {
        for (const mkt of (recentCRE ?? [])) {
          const aType = (alert as any).alert_type;
          let match = false;

          if (aType === "occupancy_drop" && mkt.vacancy_rate != null) {
            const occThreshold = conditions.occupancy_threshold ?? 85;
            if ((100 - mkt.vacancy_rate) < occThreshold) match = true;
          }
          if (aType === "caprate_shift" && mkt.cap_rate != null) {
            match = true; // any new cap rate data triggers
          }

          if (match) {
            notifications.push({
              user_id: alert.user_id,
              alert_id: alert.id,
              company_id: null,
              title: `CRE Alert: ${mkt.property_type} in ${mkt.submarket} – ${aType === "occupancy_drop" ? `Vacancy ${mkt.vacancy_rate}%` : `Cap Rate ${mkt.cap_rate}%`}`,
              detail: `Alert "${alert.name}" triggered for ${mkt.submarket}.`,
            });
            matchCount++;
          }
        }
      }
    }

    // Insert notifications
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
