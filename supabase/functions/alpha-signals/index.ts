import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // 1. Get ALL macro indicators (expanded dataset)
    const { data: macros } = await sb
      .from("macro_indicators")
      .select("series_id, label, value, unit, observation_date")
      .order("observation_date", { ascending: false });

    const latestMacros: Record<string, any> = {};
    for (const m of macros ?? []) {
      if (!latestMacros[m.series_id]) latestMacros[m.series_id] = m;
    }

    // 2. Get sector multiples
    const { data: sectors } = await sb.from("mv_sector_multiples").select("*");

    // 3. Get public market movements with sector mapping
    const { data: marketData } = await sb
      .from("public_market_data")
      .select("company_id, price_change_pct, ticker, market_cap, pe_ratio, ev_revenue, ev_ebitda")
      .not("price_change_pct", "is", null)
      .order("updated_at", { ascending: false })
      .limit(500);

    // 4. Get company sectors for correlation
    const companyIds = [...new Set((marketData ?? []).map(m => m.company_id))];
    const { data: companyData } = await sb
      .from("companies")
      .select("id, sector, name")
      .in("id", companyIds.slice(0, 200));

    const companyMap = new Map((companyData ?? []).map(c => [c.id, c]));

    // Build sector-level market movement
    const sectorMovement: Record<string, { changes: number[], avgPE: number[], avgMcap: number[] }> = {};
    for (const md of marketData ?? []) {
      const company = companyMap.get(md.company_id);
      const sector = company?.sector || "Unknown";
      if (!sectorMovement[sector]) sectorMovement[sector] = { changes: [], avgPE: [], avgMcap: [] };
      if (md.price_change_pct != null) sectorMovement[sector].changes.push(md.price_change_pct);
      if (md.pe_ratio != null) sectorMovement[sector].avgPE.push(md.pe_ratio);
      if (md.market_cap != null) sectorMovement[sector].avgMcap.push(md.market_cap);
    }

    const sectorMovementSummary = Object.entries(sectorMovement)
      .filter(([_, v]) => v.changes.length >= 3)
      .map(([sector, v]) => {
        const avgChange = (v.changes.reduce((a, b) => a + b, 0) / v.changes.length).toFixed(2);
        const avgPE = v.avgPE.length > 0 ? (v.avgPE.reduce((a, b) => a + b, 0) / v.avgPE.length).toFixed(1) : "N/A";
        return `${sector}: avg price change ${avgChange}%, avg P/E ${avgPE}x (${v.changes.length} comps)`;
      })
      .join("\n");

    // 5. Get recent sentiment signals with category breakdown
    const { data: signals } = await sb
      .from("intelligence_signals")
      .select("headline, sentiment, category, tags")
      .order("created_at", { ascending: false })
      .limit(30);

    const sentimentBreakdown = { bullish: 0, bearish: 0, neutral: 0 };
    for (const s of signals ?? []) {
      if (s.sentiment === "positive") sentimentBreakdown.bullish++;
      else if (s.sentiment === "negative") sentimentBreakdown.bearish++;
      else sentimentBreakdown.neutral++;
    }

    // 6. Get recent deal transaction activity for pattern recognition
    const { data: recentDeals } = await sb
      .from("deal_transactions")
      .select("target_industry, deal_value, ev_revenue, ev_ebitda, deal_type, status")
      .order("announced_date", { ascending: false })
      .limit(30);

    const dealActivitySummary = Object.entries(
      (recentDeals ?? []).reduce((acc: Record<string, { count: number, totalValue: number, avgEvRev: number[] }>, d) => {
        const sector = d.target_industry || "Other";
        if (!acc[sector]) acc[sector] = { count: 0, totalValue: 0, avgEvRev: [] };
        acc[sector].count++;
        acc[sector].totalValue += d.deal_value || 0;
        if (d.ev_revenue) acc[sector].avgEvRev.push(d.ev_revenue);
        return acc;
      }, {})
    ).map(([sector, v]) => {
      const avgMult = v.avgEvRev.length > 0 ? (v.avgEvRev.reduce((a, b) => a + b, 0) / v.avgEvRev.length).toFixed(1) : "N/A";
      return `${sector}: ${v.count} deals, $${(v.totalValue / 1e6).toFixed(0)}M total, avg EV/Rev ${avgMult}x`;
    }).join("\n");

    // 7. Get distressed asset trends
    const { data: distressedTrends } = await sb
      .from("distressed_assets")
      .select("sector, distress_type, discount_pct, status")
      .eq("status", "active")
      .limit(100);

    const distressedBySector: Record<string, { count: number, avgDiscount: number[] }> = {};
    for (const d of distressedTrends ?? []) {
      const s = d.sector || "Other";
      if (!distressedBySector[s]) distressedBySector[s] = { count: 0, avgDiscount: [] };
      distressedBySector[s].count++;
      if (d.discount_pct) distressedBySector[s].avgDiscount.push(d.discount_pct);
    }
    const distressedSummary = Object.entries(distressedBySector)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([sector, v]) => {
        const avgDisc = v.avgDiscount.length > 0 ? (v.avgDiscount.reduce((a, b) => a + b, 0) / v.avgDiscount.length).toFixed(0) : "N/A";
        return `${sector}: ${v.count} distressed assets, avg ${avgDisc}% discount`;
      }).join("\n");

    // Build sector list
    const sectorList = (sectors ?? []).map((s: any) => s.sector).filter(Boolean);
    if (sectorList.length === 0) {
      return new Response(JSON.stringify({ message: "No sectors with data yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build rich macro context
    const macroContext = Object.values(latestMacros)
      .map((m: any) => `${m.label}: ${m.value}${m.unit === "percent" ? "%" : ` (${m.unit})`} [as of ${m.observation_date}]`)
      .join("\n") || "No macro data available — use your knowledge of current US economic conditions (Feb 2026).";

    const sectorContext = (sectors ?? [])
      .map((s: any) => `${s.sector}: EV/Rev median ${s.ev_rev_median?.toFixed(1) ?? "N/A"}x (P25: ${s.ev_rev_p25?.toFixed(1) ?? "?"}x, P75: ${s.ev_rev_p75?.toFixed(1) ?? "?"}x), EV/EBITDA median ${s.ev_ebitda_median?.toFixed(1) ?? "N/A"}x, ${s.ev_rev_count ?? 0} comps, ${s.deal_count_12m ?? 0} deals trailing 12m`)
      .join("\n");

    const sentimentSummary = (signals ?? [])
      .slice(0, 15)
      .map((s: any) => `[${s.sentiment}] ${s.headline}`)
      .join("\n") || "No recent signals.";

    const systemPrompt = `You are a senior private equity analyst at a top-tier firm generating institutional-quality sector valuation outlooks. You integrate multiple data sources to produce high-confidence inferences about private market valuations.

ANALYTICAL FRAMEWORK:
1. MACRO REGIME ANALYSIS: Classify the current environment (risk-on/risk-off, tightening/easing, expansion/contraction). Consider how interest rate levels impact discount rates, LBO leverage, and exit multiples.

2. PUBLIC-TO-PRIVATE CORRELATION: Public market movements lead private valuations by 2-6 months. A sustained 5% drop in public comps typically translates to a 3-4% private valuation adjustment with a lag.

3. DEAL ACTIVITY PATTERNS: Rising deal volumes with expanding multiples signal a seller's market. Declining volumes with compressing multiples signal buyer opportunity. Track the bid-ask spread.

4. DISTRESSED SIGNAL INTEGRATION: Increasing distressed inventory in a sector is a leading indicator of valuation pressure. Average discount levels indicate market severity.

5. SENTIMENT-FUNDAMENTAL DIVERGENCE: When sentiment runs ahead of fundamentals (positive headlines but flat revenue), expect mean reversion. When fundamentals improve but sentiment is negative, that's the alpha opportunity.

CONFIDENCE CALIBRATION:
- "high" confidence: Multiple corroborating signals across macro, public comps, deal activity, AND sentiment. Data covers 5+ comparable companies.
- "medium" confidence: At least 2-3 corroborating signals. Some data gaps exist.
- "low" confidence: Single signal source or limited data. Directional estimate only.

MAGNITUDE GUIDELINES:
- Use realistic magnitudes. A 1-3% shift is typical for stable sectors. 5-8% for sectors with strong directional catalysts. >10% only for sector dislocations.
- Private valuations are stickier than public — dampen public market moves by 40-60%.`;

    const userPrompt = `Generate valuation outlook signals for these private market sectors: ${sectorList.join(", ")}

═══ MACRO ENVIRONMENT ═══
${macroContext}

═══ SECTOR MULTIPLES (from public comps) ═══
${sectorContext}

═══ PUBLIC MARKET SECTOR MOVEMENTS ═══
${sectorMovementSummary || "Limited public market movement data available."}

═══ RECENT M&A / DEAL ACTIVITY ═══
${dealActivitySummary || "Limited recent deal data."}

═══ DISTRESSED ASSET TRENDS ═══
${distressedSummary || "No distressed data available."}

═══ SENTIMENT SIGNALS ═══
Overall: ${sentimentBreakdown.bullish} bullish, ${sentimentBreakdown.bearish} bearish, ${sentimentBreakdown.neutral} neutral
${sentimentSummary}

For each sector, apply your multi-factor framework:
1. Identify the dominant macro regime impact on this sector
2. Map public comp movements to projected private valuation shifts
3. Flag any pattern divergences (sentiment vs fundamentals)
4. Note distressed activity as a leading indicator
5. Synthesize into a direction, magnitude, and confidence with specific reasoning`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_alpha_signals",
              description: "Submit institutional-quality valuation outlook signals for each sector analyzed using multi-factor framework.",
              parameters: {
                type: "object",
                properties: {
                  signals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sector: { type: "string", description: "Sector name exactly as provided" },
                        signal_type: { type: "string", enum: ["valuation_outlook", "risk_shift", "momentum", "dislocation"], description: "Type of signal: valuation_outlook for general direction, risk_shift for risk regime changes, momentum for accelerating trends, dislocation for mispricing opportunities" },
                        direction: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                        magnitude_pct: { type: "number", description: "Projected valuation change in percent over next 3-6 months. Use realistic magnitudes: 1-3% typical, 5-8% for strong catalysts, >10% for dislocations only." },
                        confidence: { type: "string", enum: ["low", "medium", "high"] },
                        reasoning: { type: "string", description: "3-4 sentence institutional-quality explanation. Reference specific data points from the context. Identify the dominant factor driving the signal. Flag any divergences between signals." },
                      },
                      required: ["sector", "signal_type", "direction", "magnitude_pct", "confidence", "reasoning"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["signals"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_alpha_signals" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — try again in a minute" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted — add funds in workspace settings" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const signalsToInsert = (parsed.signals ?? []).map((s: any) => ({
      sector: s.sector,
      signal_type: s.signal_type || "valuation_outlook",
      direction: s.direction,
      magnitude_pct: s.magnitude_pct,
      confidence: s.confidence,
      reasoning: s.reasoning,
      macro_context: latestMacros,
      generated_at: new Date().toISOString(),
      model_used: "google/gemini-3-flash-preview",
    }));

    if (signalsToInsert.length > 0) {
      const { error: insertError } = await sb.from("alpha_signals").insert(signalsToInsert);
      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error("Failed to store signals");
      }
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${signalsToInsert.length} alpha signals`,
        data_sources: {
          macro_indicators: Object.keys(latestMacros).length,
          sector_multiples: sectorList.length,
          public_comps: marketData?.length ?? 0,
          sentiment_signals: signals?.length ?? 0,
          recent_deals: recentDeals?.length ?? 0,
          distressed_assets: distressedTrends?.length ?? 0,
        },
        signals: signalsToInsert,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("alpha-signals error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
