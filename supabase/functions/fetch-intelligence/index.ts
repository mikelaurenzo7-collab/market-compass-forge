import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  { key: "pe_ma", query: "private equity mergers acquisitions buyout deals 2026" },
  { key: "real_estate", query: "commercial real estate investment transactions cap rates 2026" },
  { key: "venture", query: "venture capital startup funding series rounds 2026" },
  { key: "credit", query: "credit markets leveraged loans high yield bonds distressed debt 2026" },
  { key: "macro", query: "macroeconomic outlook interest rates inflation GDP 2026" },
  { key: "personnel", query: "executive moves PE venture capital partner hires departures 2026" },
  { key: "competitive", query: "competitive landscape market share shifts product launches executive moves technology disruption 2026" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    const { category } = await req.json().catch(() => ({ category: null }));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pick categories to fetch
    const categoriesToFetch = category
      ? CATEGORIES.filter((c) => c.key === category)
      : CATEGORIES.slice(0, 3); // Fetch 3 categories at a time to limit API usage

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allSignals: any[] = [];

    for (const cat of categoriesToFetch) {
      console.log(`Fetching intelligence for category: ${cat.key}`);

      try {
        // Use Perplexity if available, else Gemini
        const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

        let signals: any[] = [];

        if (perplexityKey) {
          const response = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${perplexityKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar",
              messages: [
                {
                  role: "system",
                  content: `You are a private markets intelligence analyst. Return ONLY real, verified market intelligence signals from the past 30 days. 
Return a JSON object with key "signals" containing an array. Each signal needs: headline, source, ai_summary, sentiment (bullish/bearish/neutral), tags (array of 2-3 strings), url (source URL if known).
Do NOT fabricate information. Only include events that actually happened.`,
                },
                {
                  role: "user",
                  content: `Find 3-4 recent real market intelligence signals about: ${cat.query}`,
                },
              ],
              search_recency_filter: "month",
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || "";
            const citations = data.citations || [];

            try {
              const jsonMatch = content.match(/\{[\s\S]*"signals"[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                signals = (parsed.signals || []).map((s: any, i: number) => ({
                  ...s,
                  url: s.url || citations[i] || null,
                }));
              }
            } catch (e) {
              console.error("Parse error for", cat.key, e);
            }
          }
        }

        // Fallback to Gemini if Perplexity unavailable or returned nothing
        if (signals.length === 0) {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `You are a market intelligence analyst. Return ONLY real, factual market signals you are confident actually happened. 
You MUST call the save_signals function. Do NOT fabricate events.`,
                },
                {
                  role: "user",
                  content: `Find 3 real recent market intelligence signals about: ${cat.query}`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "save_signals",
                    parameters: {
                      type: "object",
                      properties: {
                        signals: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              headline: { type: "string" },
                              source: { type: "string" },
                              ai_summary: { type: "string" },
                              sentiment: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                              tags: { type: "array", items: { type: "string" } },
                              url: { type: "string" },
                            },
                            required: ["headline", "source", "ai_summary", "sentiment", "tags"],
                          },
                        },
                      },
                      required: ["signals"],
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "save_signals" } },
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall) {
              const parsed = JSON.parse(toolCall.function.arguments);
              signals = parsed.signals || [];
            }
          }
        }

        // Add category to each signal
        for (const s of signals) {
          allSignals.push({
            headline: s.headline,
            source: s.source || "web",
            ai_summary: s.ai_summary || null,
            sentiment: s.sentiment || "neutral",
            category: cat.key,
            tags: Array.isArray(s.tags) ? s.tags : [],
            url: s.url || null,
          });
        }
      } catch (e) {
        console.error(`Error fetching ${cat.key}:`, e);
      }
    }

    if (allSignals.length === 0) {
      return new Response(
        JSON.stringify({ signals: [], message: "No real signals found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert into intelligence_signals (service role bypasses RLS)
    const { data: inserted, error: insertError } = await supabase
      .from("intelligence_signals")
      .insert(allSignals)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save signals" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Saved ${inserted?.length} real intelligence signals`);

    return new Response(JSON.stringify({ signals: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-intelligence error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
