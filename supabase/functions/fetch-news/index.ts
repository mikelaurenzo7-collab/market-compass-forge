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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { company_id, topic } = await req.json();

    // Build search query
    let searchQuery = "";
    if (company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("name, sector")
        .eq("id", company_id)
        .single();
      if (company) {
        searchQuery = `${company.name} ${company.sector || ""} latest news funding deals 2026`;
      }
    }
    if (!searchQuery) {
      searchQuery = topic || "private equity M&A venture capital deals funding news 2026";
    }

    // Use Perplexity for grounded real-time search
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

    // Fallback to LOVABLE_API_KEY + Gemini if no Perplexity
    if (!perplexityKey) {
      console.log("No Perplexity key, falling back to Lovable AI with web grounding prompt");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: "No AI provider configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use Gemini with explicit instruction to provide real, verifiable news
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
              content: `You are a financial news aggregator. Return ONLY real, factual, verifiable news articles from the past 30 days. 
Do NOT fabricate or hallucinate news. If you cannot find real recent news, return fewer articles or articles from your training data that are real.
Each article must reference real companies, real events, and real sources.
You MUST call the save_articles function with the articles array.`,
            },
            {
              role: "user",
              content: `Find 5 real, recent news articles about: ${searchQuery}. Only include articles you are confident are real events that actually happened.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "save_articles",
                description: "Save real news articles with sentiment",
                parameters: {
                  type: "object",
                  properties: {
                    articles: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          summary: { type: "string" },
                          ai_summary: { type: "string" },
                          source_name: { type: "string" },
                          source_url: { type: "string", description: "Real URL to the article if known, or null" },
                          sentiment_score: { type: "number" },
                          sentiment_label: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                          tags: { type: "array", items: { type: "string" } },
                        },
                        required: ["title", "summary", "ai_summary", "source_name", "sentiment_score", "sentiment_label", "tags"],
                      },
                    },
                  },
                  required: ["articles"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "save_articles" } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        return new Response(
          JSON.stringify({ error: "No structured response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { articles } = JSON.parse(toolCall.function.arguments);
      const now = new Date();
      const inserts = articles.map((a: any, i: number) => ({
        company_id: company_id ?? null,
        title: a.title,
        summary: a.summary,
        ai_summary: a.ai_summary,
        source_name: a.source_name,
        source_url: a.source_url || null,
        sentiment_score: a.sentiment_score,
        sentiment_label: a.sentiment_label,
        tags: a.tags,
        published_at: new Date(now.getTime() - i * 3600_000).toISOString(),
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("news_articles")
        .insert(inserts)
        .select();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save articles" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ articles: inserted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Primary path: Perplexity real-time search ---
    console.log("Fetching real news via Perplexity:", searchQuery);

    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
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
            content: `You are a financial news analyst. Return ONLY real, factual news from the past 30 days. 
For each article, provide: title, summary (2-3 sentences), ai_summary (1-sentence analyst takeaway), source_name, sentiment_score (-1 to 1), sentiment_label (bullish/bearish/neutral), and tags (2-3 keywords).
Return exactly as a JSON array under the key "articles". Do not fabricate any information.`,
          },
          {
            role: "user",
            content: `Find 5 recent real news articles about: ${searchQuery}`,
          },
        ],
        search_recency_filter: "month",
      }),
    });

    if (!perplexityResponse.ok) {
      const errText = await perplexityResponse.text();
      console.error("Perplexity error:", perplexityResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "News search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const perplexityData = await perplexityResponse.json();
    const content = perplexityData.choices?.[0]?.message?.content;
    const citations = perplexityData.citations || [];

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No results from search" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from Perplexity response
    let articles: any[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*"articles"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        articles = parsed.articles || [];
      } else {
        // Try parsing as array directly
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          articles = JSON.parse(arrayMatch[0]);
        }
      }
    } catch (e) {
      console.error("Failed to parse Perplexity response:", e);
      console.log("Raw content:", content);
    }

    if (articles.length === 0) {
      return new Response(
        JSON.stringify({ articles: [], message: "No real news found for this query" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert with real source URLs from citations
    const now = new Date();
    const inserts = articles.slice(0, 8).map((a: any, i: number) => ({
      company_id: company_id ?? null,
      title: a.title || "Untitled",
      summary: a.summary || null,
      ai_summary: a.ai_summary || null,
      source_name: a.source_name || "Web",
      source_url: a.source_url || citations[i] || null,
      sentiment_score: typeof a.sentiment_score === "number" ? a.sentiment_score : 0,
      sentiment_label: ["bullish", "bearish", "neutral"].includes(a.sentiment_label) ? a.sentiment_label : "neutral",
      tags: Array.isArray(a.tags) ? a.tags : [],
      published_at: new Date(now.getTime() - i * 1800_000).toISOString(),
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("news_articles")
      .insert(inserts)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save articles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Saved ${inserted?.length} real news articles`);

    return new Response(JSON.stringify({ articles: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-news error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
