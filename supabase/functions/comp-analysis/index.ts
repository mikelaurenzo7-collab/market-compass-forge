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

    const { company_ids } = await req.json();
    if (!company_ids || !Array.isArray(company_ids) || company_ids.length < 2) {
      return new Response(JSON.stringify({ error: "At least 2 company_ids required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Track usage
    await supabase.from("usage_tracking").insert({ user_id: user.id, action: "comp_analysis" });

    // Pull all company data
    const [companiesRes, financialsRes, fundingRes, marketRes] = await Promise.all([
      supabase.from("companies").select("*").in("id", company_ids),
      supabase.from("financials").select("*").in("company_id", company_ids).order("period", { ascending: false }),
      supabase.from("funding_rounds").select("*").in("company_id", company_ids).order("date", { ascending: false }),
      supabase.from("public_market_data").select("*").in("company_id", company_ids),
    ]);

    const companies = companiesRes.data ?? [];
    const financials = financialsRes.data ?? [];
    const funding = fundingRes.data ?? [];
    const market = marketRes.data ?? [];

    // Build context block per company
    const companyBlocks = companies.map(c => {
      const latestFin = financials.find(f => f.company_id === c.id);
      const latestFunding = funding.find(f => f.company_id === c.id);
      const mktData = market.find(m => m.company_id === c.id);

      return `
### ${c.name} (${c.market_type.toUpperCase()})
- Sector: ${c.sector ?? 'N/A'} / ${c.sub_sector ?? 'N/A'}
- Stage: ${c.stage ?? 'N/A'} | Founded: ${c.founded_year ?? 'N/A'} | Employees: ${c.employee_count ?? 'N/A'}
- HQ: ${c.hq_city ?? ''}, ${c.hq_country ?? ''}
- Revenue: $${latestFin?.revenue ? (latestFin.revenue / 1e6).toFixed(0) + 'M' : 'N/A'}
- ARR: $${latestFin?.arr ? (latestFin.arr / 1e6).toFixed(0) + 'M' : 'N/A'}
- Gross Margin: ${latestFin?.gross_margin ? (latestFin.gross_margin * 100).toFixed(0) + '%' : 'N/A'}
- EBITDA: $${latestFin?.ebitda ? (latestFin.ebitda / 1e6).toFixed(0) + 'M' : 'N/A'}
- Last Round: ${latestFunding?.round_type ?? 'N/A'} ($${latestFunding?.amount ? (latestFunding.amount / 1e6).toFixed(0) + 'M' : 'N/A'})
- Valuation: $${latestFunding?.valuation_post ? (latestFunding.valuation_post / 1e9).toFixed(1) + 'B' : mktData?.market_cap ? (Number(mktData.market_cap) / 1e9).toFixed(1) + 'B' : 'N/A'}
- Market Cap: $${mktData?.market_cap ? (Number(mktData.market_cap) / 1e9).toFixed(1) + 'B' : 'N/A'}
- P/E: ${mktData?.pe_ratio ?? 'N/A'} | Price: $${mktData?.price ?? 'N/A'}
- EV/Revenue: ${latestFin?.revenue && (latestFunding?.valuation_post || mktData?.market_cap) ? ((Number(latestFunding?.valuation_post ?? mktData?.market_cap) / Number(latestFin.revenue)).toFixed(1) + 'x') : 'N/A'}`;
    }).join('\n');

    const systemPrompt = `You are a senior investment analyst writing a comparable company analysis. Based ONLY on the data provided, generate a concise comp analysis (400-600 words) in markdown format covering:

1. **Overview** — Brief summary of the comp set and why these companies are comparable
2. **Valuation Analysis** — Compare EV/Revenue multiples, market caps, valuations. Identify who trades at a premium/discount and why
3. **Growth & Margins** — Compare revenue scale, ARR growth trajectories, margin profiles
4. **Key Takeaways** — 3-4 bullet points with actionable insights for an investment committee
5. **Relative Ranking** — Rank these companies by investment attractiveness with 1-sentence rationale each

IMPORTANT: This is for informational purposes only, not investment advice. Be data-driven and specific with numbers.

COMPANY DATA:
${companyBlocks}`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the comparable company analysis for this set." },
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("comp-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
