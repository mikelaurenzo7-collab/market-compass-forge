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

    // Auth via service client (no extra anon client needed)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
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

    // Get user's pipeline companies (only needed fields)
    const { data: pipeline } = await supabase
      .from("deal_pipeline")
      .select("company_id, stage, priority, companies(id, name, sector, sub_sector, description, stage, hq_country)")
      .eq("user_id", user.id);

    if (!pipeline || pipeline.length === 0) {
      return new Response(JSON.stringify({ matches: [], message: "Add companies to your pipeline to get AI deal matches." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sectors = [...new Set(pipeline.map((p: any) => p.companies?.sector).filter(Boolean))];
    const sectorFilter = sectors.length > 0 ? sectors : ["Technology"];

    // Fetch only needed columns with tighter limits
    const [distressed, globalOpps, dealTxns, alphaSignals] = await Promise.all([
      supabase.from("distressed_assets")
        .select("id, name, sector, asking_price, estimated_value, discount_pct, distress_type, location_city, location_state")
        .in("sector", sectorFilter).eq("status", "active").limit(15),
      supabase.from("global_opportunities")
        .select("id, name, sector, country, region, deal_value_usd, opportunity_type, risk_rating")
        .in("sector", sectorFilter).eq("status", "active").limit(15),
      supabase.from("deal_transactions")
        .select("id, target_company, target_industry, deal_value, deal_type, ev_revenue, ev_ebitda")
        .order("announced_date", { ascending: false }).limit(10),
      supabase.from("alpha_signals")
        .select("sector, direction, magnitude_pct, confidence")
        .in("sector", sectorFilter).order("generated_at", { ascending: false }).limit(5),
    ]);

    // Build compact context
    const pipelineCtx = pipeline.slice(0, 10).map((p: any) => ({
      name: p.companies?.name, sector: p.companies?.sector, subSector: p.companies?.sub_sector,
      stage: p.stage, priority: p.priority, country: p.companies?.hq_country,
    }));

    const prompt = `You are a PE/VC deal origination AI. Match the user's pipeline with opportunities.

PIPELINE: ${JSON.stringify(pipelineCtx)}

DISTRESSED: ${JSON.stringify(distressed.data ?? [])}

GLOBAL OPPS: ${JSON.stringify(globalOpps.data ?? [])}

RECENT DEALS: ${JSON.stringify(dealTxns.data ?? [])}

SIGNALS: ${JSON.stringify(alphaSignals.data ?? [])}

Return a JSON array of top 8-12 matches sorted by matchScore desc. Each: {"type":"distressed"|"global"|"deal_comp","id":"...","name":"...","matchScore":0-100,"matchReason":"max 30 words","valuationInsight":"max 25 words","riskFlag":"max 15 words","sector":"...","actionRecommendation":"investigate"|"fast_track"|"monitor"|"pass"}. Only JSON array, no other text.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Return only valid JSON arrays." },
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
