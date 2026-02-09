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

    // Verify user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { company_id, question, messages } = await req.json();
    if (!company_id || !question) {
      return new Response(JSON.stringify({ error: "company_id and question are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull company context
    const [companyRes, fundingRes, financialsRes, eventsRes] = await Promise.all([
      supabase.from("companies").select("*").eq("id", company_id).maybeSingle(),
      supabase.from("funding_rounds").select("*").eq("company_id", company_id).order("date", { ascending: false }),
      supabase.from("financials").select("*").eq("company_id", company_id).order("period", { ascending: false }).limit(3),
      supabase.from("activity_events").select("*").eq("company_id", company_id).order("published_at", { ascending: false }).limit(10),
    ]);

    const company = companyRes.data;
    if (!company) {
      return new Response(JSON.stringify({ error: "Company not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Also get comparable companies (same sector)
    const { data: comps } = await supabase
      .from("companies")
      .select("name, stage, employee_count")
      .eq("sector", company.sector)
      .neq("id", company_id)
      .limit(5);

    const contextBlock = `
COMPANY DATA:
Name: ${company.name}
Sector: ${company.sector} / ${company.sub_sector}
Stage: ${company.stage}
HQ: ${company.hq_city}, ${company.hq_country}
Employees: ${company.employee_count}
Founded: ${company.founded_year}
Description: ${company.description}

FUNDING ROUNDS:
${(fundingRes.data ?? []).map(r => `- ${r.round_type} (${r.date}): $${r.amount ? (r.amount / 1e6).toFixed(0) + 'M' : 'N/A'}, Post-val: $${r.valuation_post ? (r.valuation_post / 1e9).toFixed(1) + 'B' : 'N/A'}, Lead: ${(r.lead_investors ?? []).join(', ')}`).join('\n')}

FINANCIALS:
${(financialsRes.data ?? []).map(f => `- ${f.period}: Rev $${f.revenue ? (f.revenue / 1e6).toFixed(0) + 'M' : 'N/A'}, ARR $${f.arr ? (f.arr / 1e6).toFixed(0) + 'M' : 'N/A'}, Margin ${f.gross_margin ? (f.gross_margin * 100).toFixed(0) + '%' : 'N/A'}, EBITDA $${f.ebitda ? (f.ebitda / 1e6).toFixed(0) + 'M' : 'N/A'}`).join('\n')}

RECENT ACTIVITY:
${(eventsRes.data ?? []).map(e => `- [${e.event_type}] ${e.headline} (${e.published_at})`).join('\n')}

COMPARABLE COMPANIES (same sector):
${(comps ?? []).map(c => `- ${c.name} (${c.stage}, ${c.employee_count} employees)`).join('\n')}
`.trim();

    const systemPrompt = `You are a senior VC research analyst. You provide grounded, data-driven analysis based ONLY on the company data provided below. Be specific with numbers. Use markdown formatting. Keep responses concise but insightful (300-500 words).

${contextBlock}`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(messages ?? []),
      { role: "user", content: question },
    ];

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
        messages: chatMessages,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-research error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
