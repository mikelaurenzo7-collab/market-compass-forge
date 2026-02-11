import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { analysis_id, file_name, file_content } = await req.json();
    if (!analysis_id || !file_name) {
      return new Response(JSON.stringify({ error: "analysis_id and file_name are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `You are a senior investment analyst. Analyze the following document and extract structured data. You MUST call the extract_analysis function with the results.

Extract:
1. Company name and document type (CIM, PPM, 10-K, pitch deck, etc.)
2. Key financial metrics (revenue, EBITDA, margins, growth rates, etc.)
3. Risk factors with severity (high/medium/low)
4. Valuation indicators mentioned
5. Key deal terms
6. An executive summary (200-300 words)

Be specific with numbers. If data is not available, omit it rather than guessing.`;

    const userContent = file_content
      ? `Document: "${file_name}"\n\nContent:\n${file_content.substring(0, 30000)}`
      : `Document: "${file_name}"\n\nNote: The file content could not be extracted as text. Please analyze based on the file name and provide a template analysis structure that the user can fill in manually.`;

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
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_analysis",
            description: "Extract structured analysis from a financial document",
            parameters: {
              type: "object",
              properties: {
                company_name: { type: "string" },
                document_type: { type: "string" },
                page_count: { type: "number" },
                extracted_metrics: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      value: { type: "string" },
                      note: { type: "string" }
                    },
                    required: ["label", "value"]
                  }
                },
                risk_factors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      severity: { type: "string", enum: ["high", "medium", "low"] }
                    },
                    required: ["text", "severity"]
                  }
                },
                valuation_indicators: {
                  type: "array",
                  items: { type: "string" }
                },
                key_terms: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      value: { type: "string" }
                    },
                    required: ["label", "value"]
                  }
                },
                ai_summary: { type: "string" }
              },
              required: ["company_name", "document_type", "extracted_metrics", "risk_factors", "ai_summary"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        await supabase.from("document_analyses").update({ status: "error" }).eq("id", analysis_id);
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        await supabase.from("document_analyses").update({ status: "error" }).eq("id", analysis_id);
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      await supabase.from("document_analyses").update({ status: "error" }).eq("id", analysis_id);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      await supabase.from("document_analyses").update({ status: "error" }).eq("id", analysis_id);
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = JSON.parse(toolCall.function.arguments);

    const { error: updateError } = await supabase
      .from("document_analyses")
      .update({
        company_name: result.company_name,
        document_type: result.document_type,
        page_count: result.page_count || null,
        extracted_metrics: result.extracted_metrics || [],
        risk_factors: result.risk_factors || [],
        valuation_indicators: result.valuation_indicators || [],
        key_terms: result.key_terms || [],
        ai_summary: result.ai_summary,
        status: "complete",
        updated_at: new Date().toISOString(),
      })
      .eq("id", analysis_id);

    if (updateError) {
      console.error("DB update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save analysis" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
