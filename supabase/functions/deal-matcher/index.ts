import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Server-side entitlement check
    const { data: entitlement } = await supabase.rpc('check_entitlement', {
      _user_id: user.id,
      _feature_key: 'deal_matcher'
    });
    if (!entitlement?.allowed) {
      return new Response(JSON.stringify({ error: entitlement?.reason || 'Daily deal matcher limit reached. Upgrade for more.' }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's pipeline companies
    const { data: pipeline } = await supabase
      .from("deal_pipeline")
      .select("company_id, stage, priority, companies(id, name, sector, sub_sector, description, stage, hq_country)")
      .eq("user_id", user.id);

    if (!pipeline || pipeline.length === 0) {
      return new Response(JSON.stringify({ matches: [], message: "Add companies to your pipeline to get AI deal matches." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract sectors and characteristics
    const sectors = [...new Set(pipeline.map((p: any) => p.companies?.sector).filter(Boolean))];
    const companyNames = pipeline.map((p: any) => p.companies?.name).filter(Boolean);

    // Fetch potential matches in parallel
    const [distressed, globalOpps, dealTxns, alphaSignals] = await Promise.all([
      supabase.from("distressed_assets").select("*").in("sector", sectors.length > 0 ? sectors : ["Technology"]).eq("status", "active").limit(30),
      supabase.from("global_opportunities").select("*").in("sector", sectors.length > 0 ? sectors : ["Technology"]).eq("status", "active").limit(30),
      supabase.from("deal_transactions").select("*").order("announced_date", { ascending: false }).limit(30),
      supabase.from("alpha_signals").select("*").in("sector", sectors.length > 0 ? sectors : ["Technology"]).order("generated_at", { ascending: false }).limit(10),
    ]);

    // Build context for AI
    const pipelineContext = pipeline.slice(0, 10).map((p: any) => ({
      name: p.companies?.name,
      sector: p.companies?.sector,
      subSector: p.companies?.sub_sector,
      stage: p.stage,
      priority: p.priority,
      country: p.companies?.hq_country,
    }));

    const candidateContext = {
      distressed: (distressed.data ?? []).slice(0, 15).map((d: any) => ({
        id: d.id, name: d.name, sector: d.sector, askingPrice: d.asking_price,
        estimatedValue: d.estimated_value, discountPct: d.discount_pct,
        distressType: d.distress_type, location: `${d.location_city}, ${d.location_state}`,
      })),
      globalOpps: (globalOpps.data ?? []).slice(0, 15).map((g: any) => ({
        id: g.id, name: g.name, sector: g.sector, country: g.country,
        region: g.region, dealValueUsd: g.deal_value_usd,
        opportunityType: g.opportunity_type, riskRating: g.risk_rating,
      })),
      recentDeals: (dealTxns.data ?? []).slice(0, 10).map((d: any) => ({
        id: d.id, target: d.target_company, industry: d.target_industry,
        dealValue: d.deal_value, dealType: d.deal_type,
        evRevenue: d.ev_revenue, evEbitda: d.ev_ebitda,
      })),
      signals: (alphaSignals.data ?? []).slice(0, 5).map((s: any) => ({
        sector: s.sector, direction: s.direction, magnitude: s.magnitude_pct, confidence: s.confidence,
      })),
    };

    const prompt = `You are an elite PE/VC deal origination AI. Analyze the user's pipeline and match them with the best opportunities.

USER'S PIPELINE:
${JSON.stringify(pipelineContext, null, 2)}

AVAILABLE OPPORTUNITIES:

DISTRESSED ASSETS:
${JSON.stringify(candidateContext.distressed, null, 2)}

GLOBAL OPPORTUNITIES:
${JSON.stringify(candidateContext.globalOpps, null, 2)}

RECENT COMPARABLE DEALS:
${JSON.stringify(candidateContext.recentDeals, null, 2)}

SECTOR SIGNALS:
${JSON.stringify(candidateContext.signals, null, 2)}

Return EXACTLY a JSON array of your top 8-12 matches. Each match must have:
- "type": "distressed" | "global" | "deal_comp"
- "id": the ID from the candidate data
- "name": company/asset name
- "matchScore": 0-100 integer
- "matchReason": one-sentence explanation of strategic fit (max 30 words)
- "valuationInsight": one-sentence valuation angle (max 25 words)
- "riskFlag": one key risk to watch (max 15 words)
- "sector": the sector
- "actionRecommendation": "investigate" | "fast_track" | "monitor" | "pass"

Sort by matchScore descending. Only return the JSON array, no other text.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a deal matching AI for institutional investors. Return only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content ?? "[]";
    
    // Strip markdown fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let matches = [];
    try {
      matches = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      matches = [];
    }

    return new Response(JSON.stringify({ matches, pipelineCount: pipeline.length, sectorsAnalyzed: sectors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("deal-matcher error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
