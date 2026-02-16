import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[ANALYZE-DOCUMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { analysis_id, file_name, file_content, storage_path } = await req.json();
    if (!analysis_id || !file_name) {
      return new Response(JSON.stringify({ error: "analysis_id and file_name are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    logStep("Starting analysis", { analysis_id, file_name, hasContent: !!file_content, hasStoragePath: !!storage_path });

    // If a storage path is provided, download the file content
    let documentContent = file_content ?? "";
    if (storage_path && !documentContent) {
      logStep("Downloading from storage", { path: storage_path });
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("document-uploads")
        .download(storage_path);

      if (downloadError) {
        logStep("Storage download error", { error: downloadError.message });
        // Proceed with empty content — AI will provide template
      } else if (fileData) {
        // Try to extract text from the blob
        try {
          documentContent = await fileData.text();
          logStep("File content extracted", { length: documentContent.length });
        } catch {
          logStep("Binary file — cannot extract text directly");
          // For PDFs, convert to base64 for multimodal analysis
          try {
            const arrayBuffer = await fileData.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 500000))));
            documentContent = `[BASE64_PDF_CONTENT:${base64.substring(0, 50000)}]`;
            logStep("Converted to base64 preview");
          } catch {
            documentContent = "";
          }
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await supabase.from("document_analyses").update({ status: "error" }).eq("id", analysis_id);
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

    const userContent = documentContent && documentContent.length > 10
      ? `Document: "${file_name}"\n\nContent:\n${documentContent.substring(0, 30000)}`
      : `Document: "${file_name}"\n\nNote: The file content could not be extracted as text. Please analyze based on the file name and provide a template analysis structure that the user can fill in manually.`;

    logStep("Calling AI", { contentLength: userContent.length });

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
                    properties: { label: { type: "string" }, value: { type: "string" }, note: { type: "string" } },
                    required: ["label", "value"]
                  }
                },
                risk_factors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { text: { type: "string" }, severity: { type: "string", enum: ["high", "medium", "low"] } },
                    required: ["text", "severity"]
                  }
                },
                valuation_indicators: { type: "array", items: { type: "string" } },
                key_terms: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { label: { type: "string" }, value: { type: "string" } },
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
      const errText = await aiResponse.text();
      logStep("AI error", { status, body: errText.substring(0, 200) });
      await supabase.from("document_analyses").update({ status: "error" }).eq("id", analysis_id);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      await supabase.from("document_analyses").update({ status: "error" }).eq("id", analysis_id);
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = JSON.parse(toolCall.function.arguments);
    logStep("AI analysis complete", { company: result.company_name, type: result.document_type });

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
      logStep("DB update error", { error: updateError.message });
      return new Response(JSON.stringify({ error: "Failed to save analysis" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    logStep("Analysis saved successfully");
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
