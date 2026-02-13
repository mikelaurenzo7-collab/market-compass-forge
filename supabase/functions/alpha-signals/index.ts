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

    // 1. Get macro indicators
    const { data: macros } = await sb
      .from("macro_indicators")
      .select("series_id, label, value, unit, observation_date")
      .order("observation_date", { ascending: false });

    // Deduplicate to latest per series
    const latestMacros: Record<string, any> = {};
    for (const m of macros ?? []) {
      if (!latestMacros[m.series_id]) latestMacros[m.series_id] = m;
    }

    // 2. Get sector multiples
    const { data: sectors } = await sb.from("mv_sector_multiples").select("*");

    // 3. Get recent market movements (avg price change by sector)
    const { data: marketData } = await sb
      .from("public_market_data")
      .select("company_id, price_change_pct, ticker")
      .not("price_change_pct", "is", null)
      .order("updated_at", { ascending: false })
      .limit(200);

    // 4. Get recent sentiment signals
    const { data: signals } = await sb
      .from("intelligence_signals")
      .select("headline, sentiment, category")
      .order("created_at", { ascending: false })
      .limit(20);

    // Build sector list from mv_sector_multiples
    const sectorList = (sectors ?? []).map((s: any) => s.sector).filter(Boolean);
    if (sectorList.length === 0) {
      return new Response(JSON.stringify({ message: "No sectors with data yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context strings
    const macroContext = Object.values(latestMacros)
      .map((m: any) => `${m.label}: ${m.value}${m.unit === "percent" ? "%" : ` (${m.unit})`}`)
      .join("\n") || "No macro data available — use your knowledge of current US economic conditions (Feb 2026).";

    const sectorContext = (sectors ?? [])
      .map((s: any) => `${s.sector}: EV/Rev median ${s.ev_rev_median?.toFixed(1) ?? "N/A"}x, EV/EBITDA median ${s.ev_ebitda_median?.toFixed(1) ?? "N/A"}x, ${s.ev_rev_count ?? 0} comps`)
      .join("\n");

    const avgPriceChange = marketData?.length
      ? (marketData.reduce((acc, m) => acc + (m.price_change_pct ?? 0), 0) / marketData.length).toFixed(2)
      : "N/A";

    const sentimentSummary = (signals ?? [])
      .slice(0, 10)
      .map((s: any) => `[${s.sentiment}] ${s.headline}`)
      .join("\n") || "No recent signals.";

    const systemPrompt = `You are a senior private equity analyst at a top-tier firm. You generate institutional-quality sector valuation outlooks based on macro conditions, public market comps, and sentiment signals.

Your analysis should be data-driven and specific. Avoid generic statements. Reference the actual numbers provided.`;

    const userPrompt = `Generate valuation outlook signals for these private market sectors: ${sectorList.join(", ")}

MACRO ENVIRONMENT:
${macroContext}

SECTOR MULTIPLES (from public comps):
${sectorContext}

PUBLIC MARKET MOVEMENT:
Average price change across tracked tickers: ${avgPriceChange}%

RECENT SENTIMENT SIGNALS:
${sentimentSummary}

For each sector, estimate the directional impact on private company valuations over the next 3-6 months.`;

    // Call Lovable AI with tool calling for structured output
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
              description: "Submit valuation outlook signals for each sector analyzed.",
              parameters: {
                type: "object",
                properties: {
                  signals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sector: { type: "string", description: "Sector name exactly as provided" },
                        direction: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                        magnitude_pct: { type: "number", description: "Projected valuation change in percent, e.g. -3.5 or 2.1" },
                        confidence: { type: "string", enum: ["low", "medium", "high"] },
                        reasoning: { type: "string", description: "2-3 sentence explanation referencing specific data points" },
                      },
                      required: ["sector", "direction", "magnitude_pct", "confidence", "reasoning"],
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted — add funds in workspace settings" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      signal_type: "valuation_outlook",
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
