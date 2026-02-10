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

    const { company_id, topic } = await req.json();

    // Get company context if provided
    let companyContext = "";
    if (company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("name, sector, sub_sector, market_type, description")
        .eq("id", company_id)
        .single();
      if (company) {
        companyContext = `Company: ${company.name} (${company.sector ?? "Unknown sector"}, ${company.market_type}). ${company.description ?? ""}`;
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a financial news analyst AI. Generate realistic, plausible market news articles with sentiment analysis.

Based on the context provided, generate 5 news articles that would be relevant. Each article should feel like it comes from a real financial news wire (Bloomberg, Reuters, etc).

You MUST respond by calling the generate_news function with the articles array.`;

    const userPrompt = company_id && companyContext
      ? `Generate 5 recent news articles about or relevant to: ${companyContext}`
      : `Generate 5 recent market news articles about: ${topic ?? "technology sector trends, M&A activity, and market movements"}`;

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
              name: "generate_news",
              description: "Generate news articles with sentiment scores",
              parameters: {
                type: "object",
                properties: {
                  articles: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "News headline, concise and impactful" },
                        summary: { type: "string", description: "2-3 sentence summary of the article" },
                        ai_summary: { type: "string", description: "1-sentence analyst-grade takeaway" },
                        source_name: { type: "string", description: "News source (e.g. Reuters, Bloomberg, TechCrunch)" },
                        sentiment_score: { type: "number", description: "Sentiment from -1.0 (very bearish) to 1.0 (very bullish)" },
                        sentiment_label: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                        tags: { type: "array", items: { type: "string" }, description: "2-3 topic tags" },
                      },
                      required: ["title", "summary", "ai_summary", "source_name", "sentiment_score", "sentiment_label", "tags"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["articles"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_news" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured response from AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { articles } = JSON.parse(toolCall.function.arguments);

    // Insert into database with staggered published_at times
    const now = new Date();
    const inserts = articles.map((a: any, i: number) => ({
      company_id: company_id ?? null,
      title: a.title,
      summary: a.summary,
      ai_summary: a.ai_summary,
      source_name: a.source_name,
      sentiment_score: a.sentiment_score,
      sentiment_label: a.sentiment_label,
      tags: a.tags,
      published_at: new Date(now.getTime() - i * 3600_000).toISOString(), // stagger by 1hr each
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("news_articles")
      .insert(inserts)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save articles" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ articles: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-news error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
