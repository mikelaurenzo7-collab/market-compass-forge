import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { company_name, thesis, financials, risks, sector, stage } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a senior investment committee member known as the "Devil's Advocate." Your role is to stress-test deals by finding the 3 most compelling reasons why an investment might fail. You think like a skeptical LP or a seasoned GP who has seen deals go wrong.

Be specific, data-driven, and reference actual market dynamics. Avoid generic risks. Each counter-point should be a genuine threat that would make an IC member pause.

Return a JSON object with this exact structure:
{
  "counter_thesis": [
    { "title": "Short risk title", "reasoning": "2-3 sentence specific explanation referencing the company's actual data" }
  ],
  "overall_risk_rating": "low|medium|high|critical",
  "recommended_diligence": "One sentence describing the most important diligence step to mitigate these risks"
}`;

    const userPrompt = `Analyze this deal for the IC Pre-Mortem:

Company: ${company_name || "Unknown"}
Sector: ${sector || "Not specified"}
Stage: ${stage || "Not specified"}
Investment Thesis: ${thesis || "No thesis provided"}
Key Financials: ${financials ? JSON.stringify(financials) : "Not available"}
Known Risks: ${risks || "None documented"}

Generate exactly 3 specific counter-thesis points explaining why this deal might fail.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "generate_pre_mortem",
              description: "Generate a structured pre-mortem analysis with 3 counter-thesis points",
              parameters: {
                type: "object",
                properties: {
                  counter_thesis: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        reasoning: { type: "string" },
                      },
                      required: ["title", "reasoning"],
                      additionalProperties: false,
                    },
                    minItems: 3,
                    maxItems: 3,
                  },
                  overall_risk_rating: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                  },
                  recommended_diligence: { type: "string" },
                },
                required: ["counter_thesis", "overall_risk_rating", "recommended_diligence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_pre_mortem" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const data = await response.json();

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output from AI");
    }

    const premortem = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ premortem }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pre-mortem error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
