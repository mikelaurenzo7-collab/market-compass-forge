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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Server-side entitlement check
    const { data: entitlement } = await supabase.rpc('check_entitlement', {
      _user_id: user.id,
      _feature_key: 'morning_briefing'
    });
    if (!entitlement?.allowed) {
      return new Response(JSON.stringify({ error: entitlement?.reason || 'Daily briefing limit reached. Upgrade for more.' }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather context for the briefing in parallel
    const yesterday = new Date(Date.now() - 86400_000).toISOString();
    const weekAgo = new Date(Date.now() - 86400_000 * 7).toISOString();

    const [
      pipelineRes,
      newsRes,
      signalsRes,
      fundingRes,
      distressedRes,
      alphaRes,
      macroRes,
    ] = await Promise.all([
      // User's pipeline deals with company info
      supabase
        .from("deal_pipeline")
        .select("stage, priority, updated_at, companies(name, sector)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(10),
      // Recent news with sentiment
      supabase
        .from("news_articles")
        .select("title, sentiment_label, ai_summary, source_name")
        .gte("published_at", yesterday)
        .order("published_at", { ascending: false })
        .limit(8),
      // Recent intelligence signals
      supabase
        .from("intelligence_signals")
        .select("headline, category, sentiment, ai_summary")
        .gte("created_at", yesterday)
        .order("created_at", { ascending: false })
        .limit(6),
      // Recent funding rounds
      supabase
        .from("funding_rounds")
        .select("round_type, amount, date, companies(name, sector)")
        .gte("date", weekAgo.split("T")[0])
        .order("date", { ascending: false })
        .limit(5),
      // New distressed assets
      supabase
        .from("distressed_assets")
        .select("name, asset_type, discount_pct, asking_price")
        .eq("status", "active")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(5),
      // Latest alpha signals
      supabase
        .from("alpha_signals")
        .select("sector, direction, confidence, magnitude_pct, reasoning")
        .order("generated_at", { ascending: false })
        .limit(5),
      // Latest macro indicators
      supabase
        .from("macro_indicators")
        .select("label, value, unit, observation_date")
        .order("fetched_at", { ascending: false })
        .limit(6),
    ]);

    const contextBlock = `
USER'S PIPELINE (${(pipelineRes.data ?? []).length} active deals):
${(pipelineRes.data ?? []).map((d: any) => `- ${d.companies?.name} (${d.companies?.sector}) → ${d.stage}, priority: ${d.priority}`).join("\n") || "No active deals"}

OVERNIGHT NEWS (last 24h):
${(newsRes.data ?? []).map((n: any) => `- [${n.sentiment_label}] ${n.title} (${n.source_name}) — ${n.ai_summary || ""}`).join("\n") || "No recent news"}

MARKET INTELLIGENCE SIGNALS:
${(signalsRes.data ?? []).map((s: any) => `- [${s.category}/${s.sentiment}] ${s.headline}`).join("\n") || "No recent signals"}

RECENT FUNDING ROUNDS:
${(fundingRes.data ?? []).map((r: any) => `- ${r.companies?.name}: ${r.round_type} $${r.amount ? (r.amount / 1e6).toFixed(0) + "M" : "undisclosed"}`).join("\n") || "No recent rounds"}

NEW DISTRESSED OPPORTUNITIES:
${(distressedRes.data ?? []).map((d: any) => `- ${d.name} (${d.asset_type}): ${d.discount_pct}% discount, asking $${d.asking_price ? (d.asking_price / 1e6).toFixed(1) + "M" : "N/A"}`).join("\n") || "None"}

ALPHA SIGNALS (predictive):
${(alphaRes.data ?? []).map((a: any) => `- ${a.sector}: ${a.direction} (${a.confidence} confidence, ${a.magnitude_pct}% magnitude) — ${a.reasoning?.slice(0, 100)}`).join("\n") || "None"}

MACRO INDICATORS:
${(macroRes.data ?? []).map((m: any) => `- ${m.label}: ${m.value}${m.unit === "percent" ? "%" : ""} (${m.observation_date})`).join("\n") || "No data"}
`.trim();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a senior investment analyst preparing a morning briefing for a PE/VC professional. 
Synthesize the overnight data into actionable intelligence. Be concise, data-driven, and highlight what matters most.
Focus on: (1) what changed overnight, (2) pipeline implications, (3) opportunities to act on today.
Use the tool to return structured output. Each section should be 2-4 sentences max. Be specific with numbers.`,
          },
          {
            role: "user",
            content: `Generate my morning briefing based on this data:\n\n${contextBlock}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "morning_briefing",
              description: "Return a structured morning briefing",
              parameters: {
                type: "object",
                properties: {
                  greeting: { type: "string", description: "One-line greeting with date and market mood (e.g., 'Good morning — markets are cautious ahead of CPI data.')" },
                  market_pulse: { type: "string", description: "2-3 sentence overview of overnight market activity, key moves, and sentiment direction" },
                  pipeline_update: { type: "string", description: "Status of user's pipeline deals — any that need attention, stale deals, or stage changes to consider" },
                  opportunities: { type: "string", description: "Top 2-3 actionable opportunities from new funding, distressed assets, or intelligence signals" },
                  risks_watch: { type: "string", description: "Key risks or macro factors to monitor today — what could impact the portfolio" },
                  action_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string", description: "Specific action to take" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        context: { type: "string", description: "Why this matters" },
                      },
                      required: ["action", "priority", "context"],
                    },
                    description: "3-5 prioritized action items for today",
                  },
                },
                required: ["greeting", "market_pulse", "pipeline_update", "opportunities", "risks_watch", "action_items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "morning_briefing" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", aiResponse.status);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await aiResponse.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Failed to generate briefing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const briefing = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ briefing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("morning-briefing error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
