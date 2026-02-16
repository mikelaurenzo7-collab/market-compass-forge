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

    // Server-side usage limit enforcement
    const FREE_LIMIT = 3;
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { data: tier } = await supabase
      .from("subscription_tiers")
      .select("tier")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tier || (tier.tier !== "pro" && tier.tier !== "enterprise")) {
      const { count } = await supabase
        .from("usage_tracking")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("action", "memo_generation")
        .gte("created_at", startOfDay.toISOString());

      if ((count ?? 0) >= FREE_LIMIT) {
        return new Response(JSON.stringify({ error: "Daily memo generation limit reached. Upgrade to Pro for more." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    await supabase.from("usage_tracking").insert({ user_id: user.id, action: "memo_generation" });

    const [companyRes, fundingRes, financialsRes, eventsRes, investorsRes, personnelRes, capTableRes, newsRes, kpiRes] = await Promise.all([
      supabase.from("companies").select("*").eq("id", company_id).maybeSingle(),
      supabase.from("funding_rounds").select("*").eq("company_id", company_id).order("date", { ascending: false }),
      supabase.from("financials").select("*").eq("company_id", company_id).order("period", { ascending: false }),
      supabase.from("activity_events").select("*").eq("company_id", company_id).order("published_at", { ascending: false }).limit(10),
      supabase.from("investor_company").select("*, investors(name, type, aum)").eq("company_id", company_id),
      supabase.from("key_personnel").select("*").eq("company_id", company_id).limit(10),
      supabase.from("cap_table_snapshots").select("*").eq("company_id", company_id).order("snapshot_date", { ascending: false }).limit(10),
      supabase.from("news_articles").select("title, sentiment_label, ai_summary").eq("company_id", company_id).order("published_at", { ascending: false }).limit(5),
      supabase.from("kpi_metrics").select("*").eq("company_id", company_id).order("period", { ascending: false }).limit(10),
    ]);

    const company = companyRes.data;
    if (!company) {
      return new Response(JSON.stringify({ error: "Company not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const financials = financialsRes.data ?? [];
    const fundingRounds = fundingRes.data ?? [];
    const kpis = kpiRes.data ?? [];
    const capTable = capTableRes.data ?? [];

    // ── Build machine-readable citations ──
    const fmtCurrency = (v: number) => {
      if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
      if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
      return `$${v.toLocaleString()}`;
    };

    interface Citation {
      id: string;
      metric: string;
      value: number | string;
      formattedValue: string;
      source: string;
      sourceField: string;
      period?: string;
      confidence: string;
      verifiedAt: string;
      sourceType?: string;
    }

    let citeIdx = 0;
    const citations: Citation[] = [];
    const lowConfidenceMetrics: string[] = [];

    const addCite = (metric: string, value: number | string, formatted: string, source: string, field: string, conf: string, verified: string, period?: string, srcType?: string) => {
      const id = `cite_${++citeIdx}`;
      const c: Citation = { id, metric, value, formattedValue: formatted, source, sourceField: field, period, confidence: conf || "medium", verifiedAt: verified, sourceType: srcType };
      citations.push(c);
      if (conf === "low" || conf === "unverified") lowConfidenceMetrics.push(`${metric} (${conf})`);
      return id;
    };

    // Company-level
    if (company.employee_count) addCite("Employee Count", company.employee_count, company.employee_count.toLocaleString(), "companies", "employee_count", "medium", company.updated_at);

    // Financials
    for (const f of financials) {
      const conf = f.confidence_score ?? "medium";
      const ver = f.fetched_at ?? f.created_at;
      if (f.revenue) addCite(`Revenue (${f.period})`, f.revenue, fmtCurrency(f.revenue), "financials", "revenue", conf, ver, f.period, f.source_type);
      if (f.arr) addCite(`ARR (${f.period})`, f.arr, fmtCurrency(f.arr), "financials", "arr", conf, ver, f.period, f.source_type);
      if (f.ebitda) addCite(`EBITDA (${f.period})`, f.ebitda, fmtCurrency(f.ebitda), "financials", "ebitda", conf, ver, f.period, f.source_type);
      if (f.gross_margin) addCite(`Gross Margin (${f.period})`, f.gross_margin, `${(f.gross_margin * 100).toFixed(0)}%`, "financials", "gross_margin", conf, ver, f.period, f.source_type);
      if (f.burn_rate) addCite(`Burn Rate (${f.period})`, f.burn_rate, fmtCurrency(Math.abs(f.burn_rate)) + "/mo", "financials", "burn_rate", conf, ver, f.period, f.source_type);
    }

    // Funding
    for (const r of fundingRounds) {
      const conf = r.confidence_score ?? "medium";
      const ver = r.fetched_at ?? r.created_at;
      if (r.amount) addCite(`${r.round_type} Raise`, r.amount, fmtCurrency(r.amount), "funding_rounds", "amount", conf, ver, r.date, r.source_type);
      if (r.valuation_post) addCite(`${r.round_type} Post-Money`, r.valuation_post, fmtCurrency(r.valuation_post), "funding_rounds", "valuation_post", conf, ver, r.date, r.source_type);
    }

    // KPIs
    for (const k of kpis) {
      addCite(`${k.metric_name} (${k.period})`, k.value, String(k.value), "kpi_metrics", k.metric_name, k.confidence_score ?? "medium", k.created_at, k.period, k.definition_source);
    }

    // Build citation reference block for AI prompt
    const citationBlock = citations.map(c =>
      `[${c.id}] ${c.metric}: ${c.formattedValue} (source: ${c.source}.${c.sourceField}, confidence: ${c.confidence}, verified: ${c.verifiedAt?.split("T")[0] ?? "unknown"})`
    ).join("\n");

    const lowConfBlock = lowConfidenceMetrics.length > 0
      ? `\n\nLOW-CONFIDENCE METRICS — MUST be labeled as "⚠️ Estimate" or excluded:\n${lowConfidenceMetrics.map(m => `⚠️ ${m}`).join("\n")}`
      : "";

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
${fundingRounds.map(r => `${r.round_type} (${r.date}): Raised ${fmtCurrency(r.amount ?? 0)}, Post: ${r.valuation_post ? fmtCurrency(r.valuation_post) : 'N/A'}, Lead: ${(r.lead_investors ?? []).join(', ')}`).join('\n')}

FINANCIALS:
${financials.map(f => `${f.period}: Rev ${f.revenue ? fmtCurrency(f.revenue) : 'N/A'}, ARR ${f.arr ? fmtCurrency(f.arr) : 'N/A'}, Margin ${f.gross_margin ? (f.gross_margin * 100).toFixed(0) + '%' : 'N/A'}, Burn ${f.burn_rate ? fmtCurrency(Math.abs(f.burn_rate)) + '/mo' : 'N/A'}, EBITDA ${f.ebitda ? fmtCurrency(f.ebitda) : 'N/A'}`).join('\n')}

KPI METRICS:
${kpis.map((k: any) => `${k.metric_name} (${k.period}): ${k.value}`).join('\n')}

MANAGEMENT TEAM:
${(personnelRes.data ?? []).map((p: any) => `${p.name} — ${p.title}${p.background ? ': ' + p.background : ''}`).join('\n') || 'Not available'}

CAP TABLE:
${capTable.map((c: any) => `${c.shareholder_name}: ${c.shares} shares (${c.share_class}), ${c.ownership_pct ? (c.ownership_pct * 100).toFixed(1) + '%' : 'N/A'}`).join('\n') || 'Not available'}

INVESTORS:
${(investorsRes.data ?? []).map(i => `${(i as any).investors?.name} (${(i as any).investors?.type}), est. ownership: ${i.ownership_pct_est ? (i.ownership_pct_est * 100).toFixed(1) + '%' : 'N/A'}`).join('\n')}

RECENT NEWS:
${(newsRes.data ?? []).map((n: any) => `[${n.sentiment_label}] ${n.title} — ${n.ai_summary || ''}`).join('\n') || 'None'}

RECENT EVENTS:
${(eventsRes.data ?? []).map(e => `[${e.event_type}] ${e.headline}`).join('\n')}

SECTOR COMPARABLES:
${(comps ?? []).map(c => `${c.name} (${c.stage}, ${c.employee_count} emp, founded ${c.founded_year})`).join('\n')}

CITATION REFERENCE TABLE:
${citationBlock}
${lowConfBlock}
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
            content: `You are a senior investment analyst preparing an institutional-grade investment memo.

CRITICAL CITATION RULES:
1. Every numeric claim MUST reference a citation ID from the CITATION REFERENCE TABLE using format [cite_N].
2. Low-confidence metrics MUST be prefixed with "⚠️ Estimate:" and clearly labeled.
3. Do NOT invent or hallucinate any numbers not in the citation table. If data is missing, state "Data not available" instead.
4. Include citation IDs inline, e.g.: "Revenue reached $50M [cite_3] with ARR of $60M [cite_4]."

DISCLAIMER: Include a brief note that this is for informational purposes only.

${contextBlock}`,
          },
          {
            role: "user",
            content: `Generate a comprehensive institutional-grade investment memo for ${company.name}. Reference citation IDs for every numeric claim.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "investment_memo",
              description: "Return a structured investment memo. All numeric claims must include [cite_N] references.",
              parameters: {
                type: "object",
                properties: {
                  company_name: { type: "string" },
                  date: { type: "string", description: "Today's date" },
                  executive_summary: { type: "string", description: "3-4 sentence executive summary with citation references for key metrics." },
                  thesis: { type: "string", description: "Investment thesis with cited evidence (200+ words)" },
                  market: { type: "string", description: "Market analysis with cited TAM/SAM figures where available" },
                  traction: { type: "string", description: "Revenue metrics and growth with inline citations [cite_N] for every number" },
                  management: { type: "string", description: "Management team assessment" },
                  competitive_landscape: { type: "string", description: "Competitive analysis with cited positioning data" },
                  risks: { type: "string", description: "Key risks with severity. Label low-confidence data with ⚠️" },
                  valuation: { type: "string", description: "Valuation analysis with cited multiples and comparables" },
                  terms_structure: { type: "string", description: "Deal terms with cited cap table data" },
                  recommendation: { type: "string", description: "Final recommendation with confidence level" },
                },
                required: ["company_name", "date", "executive_summary", "thesis", "market", "traction", "management", "competitive_landscape", "risks", "valuation", "terms_structure", "recommendation"],
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
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Failed to generate memo" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const memo = JSON.parse(toolCall.function.arguments);

    // Save memo snapshot with citations
    await supabase.from("memo_snapshots").insert({
      company_id,
      user_id: user.id,
      memo_content: memo,
      citations,
      model_version: "v1.0.0",
      review_state: "draft",
    });

    return new Response(JSON.stringify({
      memo,
      citations,
      lowConfidenceMetrics,
      reviewState: "draft",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-memo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
