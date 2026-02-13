import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get latest alpha signals
    const { data: signals } = await supabase
      .from("alpha_signals")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(20);

    if (!signals?.length) {
      return new Response(JSON.stringify({ message: "No signals to analyze" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedupe to latest per sector
    const seen = new Set<string>();
    const latestSignals = signals.filter((s: any) => {
      if (seen.has(s.sector)) return false;
      seen.add(s.sector);
      return true;
    });

    // 2. Get recent intelligence signals for sentiment context
    const { data: sentimentSignals } = await supabase
      .from("intelligence_signals")
      .select("headline, sentiment, category")
      .order("created_at", { ascending: false })
      .limit(50);

    // 3. Detect patterns
    const alerts: { title: string; detail: string }[] = [];

    // Pattern 1: Sentiment-fundamental divergence
    for (const signal of latestSignals) {
      const sectorSentiment = (sentimentSignals ?? []).filter(
        (s: any) => s.category?.toLowerCase().includes(signal.sector.toLowerCase().split(" ")[0])
      );

      if (sectorSentiment.length >= 3) {
        const bullishSentiment = sectorSentiment.filter((s: any) => s.sentiment === "positive").length;
        const bearishSentiment = sectorSentiment.filter((s: any) => s.sentiment === "negative").length;
        const sentimentRatio = bullishSentiment / Math.max(1, sectorSentiment.length);

        // Bullish sentiment + bearish fundamentals = warning
        if (sentimentRatio > 0.6 && signal.direction === "bearish") {
          alerts.push({
            title: `⚠️ Divergence Alert: ${signal.sector}`,
            detail: `Sentiment is ${Math.round(sentimentRatio * 100)}% bullish but AI fundamentals show bearish (-${Math.abs(signal.magnitude_pct).toFixed(1)}%). Potential correction risk.`,
          });
        }
        // Bearish sentiment + bullish fundamentals = opportunity
        if (sentimentRatio < 0.3 && signal.direction === "bullish") {
          alerts.push({
            title: `🟢 Opportunity Alert: ${signal.sector}`,
            detail: `Sentiment is ${Math.round((1 - sentimentRatio) * 100)}% bearish but AI fundamentals show bullish (+${signal.magnitude_pct.toFixed(1)}%). Potential contrarian entry.`,
          });
        }
      }
    }

    // Pattern 2: Sector rotation detection
    const bullishSectors = latestSignals.filter((s: any) => s.direction === "bullish" && s.magnitude_pct > 3);
    const bearishSectors = latestSignals.filter((s: any) => s.direction === "bearish" && s.magnitude_pct < -3);

    if (bullishSectors.length > 0 && bearishSectors.length > 0) {
      alerts.push({
        title: `🔄 Sector Rotation Detected`,
        detail: `Capital rotating from ${bearishSectors.map((s: any) => s.sector).join(", ")} → ${bullishSectors.map((s: any) => s.sector).join(", ")}. Magnitude: ${bearishSectors[0]?.magnitude_pct?.toFixed(1) ?? 0}% out, +${bullishSectors[0]?.magnitude_pct?.toFixed(1) ?? 0}% in.`,
      });
    }

    // Pattern 3: High-conviction signals
    const highConviction = latestSignals.filter((s: any) => s.confidence === "high" && Math.abs(s.magnitude_pct) > 5);
    for (const signal of highConviction) {
      alerts.push({
        title: `🎯 High-Conviction Signal: ${signal.sector}`,
        detail: `${signal.direction === "bullish" ? "Bullish" : "Bearish"} ${Math.abs(signal.magnitude_pct).toFixed(1)}% move with HIGH confidence. ${signal.reasoning?.slice(0, 120) ?? ""}`,
      });
    }

    // 4. Store alerts for all users who have alert preferences
    if (alerts.length > 0) {
      // Get all users who might want alerts (users with profiles)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id")
        .limit(100);

      const userIds = (profiles ?? []).map((p: any) => p.user_id);

      const alertInserts = userIds.flatMap((userId: string) =>
        alerts.map((alert) => ({
          user_id: userId,
          title: alert.title,
          detail: alert.detail,
        }))
      );

      if (alertInserts.length > 0) {
        await supabase.from("alert_notifications").insert(alertInserts);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${alerts.length} pattern alerts`,
        alerts: alerts.map((a) => a.title),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
