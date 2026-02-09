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

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [companyRes, fundingRes, financialsRes, eventsRes, investorsRes] = await Promise.all([
      supabase.from("companies").select("*").eq("id", company_id).maybeSingle(),
      supabase.from("funding_rounds").select("*").eq("company_id", company_id).order("date", { ascending: false }),
      supabase.from("financials").select("*").eq("company_id", company_id).order("period", { ascending: false }),
      supabase.from("activity_events").select("*").eq("company_id", company_id).order("published_at", { ascending: false }).limit(10),
      supabase.from("investor_company").select("*, investors(name, type, aum)").eq("company_id", company_id),
    ]);

    const company = companyRes.data;
    if (!company) {
      return new Response(JSON.stringify({ error: "Company not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get sector comps
    const { data: comps } = await supabase
      .from("companies")
      .select("name, stage, employee_count, founded_year")
      .eq("sector", company.sector)
      .neq("id", company_id)
      .limit(5);

    const contextBlock = `
COMPANY: ${company.name}
Sector: ${company.sector} / ${company.sub_sector}
Stage: ${company.stage} | HQ: ${company.hq_city}, ${company.hq_country} | Employees: ${company.employee_count} | Founded: ${company.founded_year}
Description: ${company.description}

FUNDING HISTORY:
${(fundingRes.data ?? []).map(r => `${r.round_type} (${r.date}): Raised $${r.amount ? (r.amount / 1e6).toFixed(0) + 'M' : 'N/A'}, Pre: $${r.valuation_pre ? (r.valuation_pre / 1e9).toFixed(1) + 'B' : 'N/A'}, Post: $${r.valuation_post ? (r.valuation_post / 1e9).toFixed(1) + 'B' : 'N/A'}, Lead: ${(r.lead_investors ?? []).join(', ')}`).join('\n')}

FINANCIALS:
${(financialsRes.data ?? []).map(f => `${f.period}: Rev $${f.revenue ? (f.revenue / 1e6).toFixed(0) + 'M' : 'N/A'}, ARR $${f.arr ? (f.arr / 1e6).toFixed(0) + 'M' : 'N/A'}, Margin ${f.gross_margin ? (f.gross_margin * 100).toFixed(0) + '%' : 'N/A'}, Burn $${f.burn_rate ? (f.burn_rate / 1e6).toFixed(0) + 'M/mo' : 'N/A'}, EBITDA $${f.ebitda ? (f.ebitda / 1e6).toFixed(0) + 'M' : 'N/A'}`).join('\n')}

INVESTORS:
${(investorsRes.data ?? []).map(i => `${(i as any).investors?.name} (${(i as any).investors?.type}), est. ownership: ${i.ownership_pct_est ? (i.ownership_pct_est * 100).toFixed(1) + '%' : 'N/A'}`).join('\n')}

RECENT EVENTS:
${(eventsRes.data ?? []).map(e => `[${e.event_type}] ${e.headline}`).join('\n')}

SECTOR COMPARABLES:
${(comps ?? []).map(c => `${c.name} (${c.stage}, ${c.employee_count} emp, founded ${c.founded_year})`).join('\n')}
`.trim();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
            content: `You are a senior investment analyst at a top-tier VC firm. Generate a comprehensive investment memo based on the company data provided. Be data-driven and specific with numbers. Use the tool to return structured output.

${contextBlock}`,
          },
          {
            role: "user",
            content: `Generate a full investment memo for ${company.name}.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "investment_memo",
              description: "Return a structured investment memo with all sections",
              parameters: {
                type: "object",
                properties: {
                  company_name: { type: "string" },
                  date: { type: "string", description: "Today's date" },
                  thesis: { type: "string", description: "2-3 paragraph investment thesis explaining why this is compelling (200+ words)" },
                  market: { type: "string", description: "Market size, dynamics, tailwinds, and competitive landscape analysis (200+ words)" },
                  traction: { type: "string", description: "Revenue metrics, growth trajectory, customer momentum, product-market fit indicators (150+ words)" },
                  risks: { type: "string", description: "Key investment risks and mitigants, 4-6 bullet points" },
                  valuation: { type: "string", description: "Valuation analysis including multiples, comparables, and whether current pricing is attractive (150+ words)" },
                  recommendation: { type: "string", description: "Final recommendation: Invest / Pass / Monitor, with conviction level and key conditions" },
                },
                required: ["company_name", "date", "thesis", "market", "traction", "risks", "valuation", "recommendation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "investment_memo" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await aiResponse.json();
    console.log("AI memo result:", JSON.stringify(result).slice(0, 500));

    // Extract tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Failed to generate memo" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const memo = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ memo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-memo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
