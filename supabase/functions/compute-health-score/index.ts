import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { companyId } = await req.json();
    if (!companyId) throw new Error("companyId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Gather all company data in parallel
    const [companyRes, financialsRes, fundingRes, signalsRes, macroRes, newsRes, enrichRes] = await Promise.all([
      supabase.from("companies").select("*").eq("id", companyId).single(),
      supabase.from("financials").select("*").eq("company_id", companyId).order("period", { ascending: false }).limit(5),
      supabase.from("funding_rounds").select("*").eq("company_id", companyId).order("date", { ascending: false }).limit(5),
      supabase.from("alpha_signals").select("*").order("generated_at", { ascending: false }).limit(20),
      supabase.from("macro_indicators").select("*").order("observation_date", { ascending: false }).limit(20),
      supabase.from("news_articles").select("title, sentiment_label, sentiment_score, published_at").eq("company_id", companyId).order("published_at", { ascending: false }).limit(10),
      supabase.from("company_enrichments").select("title, summary, data_type, confidence_score").eq("company_id", companyId).order("scraped_at", { ascending: false }).limit(5),
    ]);

    const company = companyRes.data;
    if (!company) throw new Error("Company not found");

    const financials = financialsRes.data ?? [];
    const funding = fundingRes.data ?? [];
    const signals = signalsRes.data ?? [];
    const macro = macroRes.data ?? [];
    const news = newsRes.data ?? [];
    const enrichments = enrichRes.data ?? [];

    // Find sector signal
    const sectorSignal = signals.find((s: any) =>
      company.sector?.toLowerCase().includes(s.sector.toLowerCase()) ||
      s.sector.toLowerCase().includes(company.sector?.toLowerCase() ?? "")
    );

    // Dedupe macro
    const macroMap: Record<string, any> = {};
    macro.forEach((m: any) => { if (!macroMap[m.series_id]) macroMap[m.series_id] = m; });

    const prompt = `You are an institutional-grade investment analyst. Analyze this company and produce a comprehensive health assessment.

COMPANY: ${company.name}
Sector: ${company.sector || "Unknown"} | Sub-sector: ${company.sub_sector || "N/A"}
Stage: ${company.stage || "Unknown"} | Market: ${company.market_type}
HQ: ${company.hq_city || "Unknown"}, ${company.hq_country || "Unknown"}
Employees: ${company.employee_count || "Unknown"} | Founded: ${company.founded_year || "Unknown"}

FINANCIALS (latest periods):
${financials.length ? financials.map((f: any) => `${f.period}: Rev=${f.revenue ?? "N/A"}, ARR=${f.arr ?? "N/A"}, EBITDA=${f.ebitda ?? "N/A"}, Gross Margin=${f.gross_margin ?? "N/A"}, Burn=${f.burn_rate ?? "N/A"}, Runway=${f.runway_months ?? "N/A"}mo`).join("\n") : "No financial data available"}

FUNDING HISTORY:
${funding.length ? funding.map((r: any) => `${r.round_type}: ${r.amount ? "$" + (r.amount / 1e6).toFixed(1) + "M" : "Undisclosed"} at ${r.valuation_post ? "$" + (r.valuation_post / 1e6).toFixed(0) + "M" : "N/A"} post (${r.date || "N/A"})`).join("\n") : "No funding data"}

SECTOR SIGNAL: ${sectorSignal ? `${sectorSignal.direction} ${sectorSignal.magnitude_pct}% (${sectorSignal.confidence} confidence) - ${sectorSignal.reasoning || ""}` : "No sector signal"}

MACRO ENVIRONMENT:
${Object.values(macroMap).map((m: any) => `${m.label}: ${m.value}${m.unit === "percent" ? "%" : ""}`).join(", ")}

NEWS SENTIMENT:
${news.length ? news.map((n: any) => `[${n.sentiment_label || "neutral"}] ${n.title}`).join("\n") : "No recent news"}

ENRICHMENT DATA:
${enrichments.length ? enrichments.map((e: any) => `[${e.data_type}] ${e.title || ""}: ${e.summary || ""}`.slice(0, 200)).join("\n") : "No enrichment data"}

Return a JSON response using the suggest_health_score tool.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior investment analyst at a top-tier PE firm. Provide institutional-quality assessments." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_health_score",
              description: "Return a comprehensive company health assessment with score, factors, and recommendations.",
              parameters: {
                type: "object",
                properties: {
                  overallScore: { type: "number", description: "0-100 composite health score" },
                  scoreLabel: { type: "string", enum: ["Critical", "Weak", "Fair", "Strong", "Exceptional"] },
                  summary: { type: "string", description: "2-3 sentence executive summary of the company's health" },
                  factors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Factor name like Growth, Profitability, Market Position, etc." },
                        score: { type: "number", description: "0-100 score for this factor" },
                        insight: { type: "string", description: "One sentence insight" },
                      },
                      required: ["name", "score", "insight"],
                      additionalProperties: false,
                    },
                    description: "5-6 key health factors",
                  },
                  opportunities: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 actionable opportunities",
                  },
                  risks: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 key risks to monitor",
                  },
                  macroImpact: { type: "string", description: "How current macro environment specifically affects this company" },
                  sectorOutlook: { type: "string", description: "Sector-specific outlook tied to alpha signals" },
                },
                required: ["overallScore", "scoreLabel", "summary", "factors", "opportunities", "risks", "macroImpact", "sectorOutlook"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_health_score" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const healthScore = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(healthScore), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compute-health-score error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
