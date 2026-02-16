import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Valuation Engine (canonical copy) ───

const MODEL_VERSION = "v1.0.0";

const WEIGHTS = {
  scale: 0.18, valuation: 0.22, growth: 0.18,
  sectorMomentum: 0.12, efficiency: 0.15, capitalEfficiency: 0.15,
};

const GRADE_MAP = [
  { min: 90, grade: "A+", color: "text-success" },
  { min: 80, grade: "A", color: "text-success" },
  { min: 70, grade: "A-", color: "text-success" },
  { min: 62, grade: "B+", color: "text-chart-2" },
  { min: 55, grade: "B", color: "text-primary" },
  { min: 48, grade: "B-", color: "text-primary" },
  { min: 40, grade: "C+", color: "text-warning" },
  { min: 32, grade: "C", color: "text-warning" },
  { min: 25, grade: "C-", color: "text-warning" },
  { min: 15, grade: "D", color: "text-destructive" },
  { min: 0, grade: "F", color: "text-destructive" },
];

const getGrade = (score: number) => {
  const g = GRADE_MAP.find((g) => score >= g.min) ?? GRADE_MAP[GRADE_MAP.length - 1];
  return { grade: g.grade, color: g.color };
};

const percentileRank = (sortedArr: number[], value: number): number => {
  if (sortedArr.length === 0 || value <= 0) return 0;
  const rank = sortedArr.filter((a) => a <= value).length;
  return (rank / sortedArr.length) * 100;
};

interface CompanyInputs {
  sector: string | null; stage: string | null; employeeCount: number | null;
  arr: number; revenue: number; ebitda: number; valuation: number;
  grossMargin: number; burnRate: number; runwayMonths: number;
  previousArr: number; historicals: { period: string; arr: number | null; revenue: number | null }[];
}

interface SectorBenchmarks {
  evRevenueMedian: number; evEbitdaMedian: number; dealCount12m: number;
  fundingCount12m: number; evRevenueCount: number;
}

function computeValuationScore(inputs: CompanyInputs, peerArrDistribution: number[], sectorBenchmarks: SectorBenchmarks | null) {
  const effectiveArr = inputs.arr > 0 ? inputs.arr : inputs.revenue;
  const insights: string[] = [];
  const inputQualityFlags: string[] = [];
  const confidenceAdjustments: string[] = [];

  if (inputs.arr <= 0 && inputs.revenue <= 0) inputQualityFlags.push("No ARR or revenue data");
  if (inputs.arr <= 0 && inputs.revenue > 0) inputQualityFlags.push("ARR missing — using revenue as proxy");
  if (inputs.valuation <= 0) inputQualityFlags.push("No valuation data");
  if (inputs.historicals.length < 2) inputQualityFlags.push("Insufficient historical periods for CAGR");
  if (inputs.grossMargin <= 0) inputQualityFlags.push("Gross margin missing");
  if (!sectorBenchmarks || sectorBenchmarks.evRevenueMedian <= 0) {
    inputQualityFlags.push("No sector benchmark data");
    confidenceAdjustments.push("Sector-relative scoring unavailable");
  }

  let impliedMultiple: number | null = null;
  let evEbitda: number | null = null;
  if (inputs.valuation > 0 && effectiveArr > 0) impliedMultiple = inputs.valuation / effectiveArr;
  if (inputs.valuation > 0 && inputs.ebitda > 0) evEbitda = inputs.valuation / inputs.ebitda;

  let revenueCAGR: number | null = null;
  if (inputs.historicals.length >= 2) {
    const sorted = [...inputs.historicals].sort((a, b) => a.period.localeCompare(b.period));
    const earlyRev = sorted[0].arr ?? sorted[0].revenue ?? 0;
    const latestRev = sorted[sorted.length - 1].arr ?? sorted[sorted.length - 1].revenue ?? 0;
    const years = parseInt(sorted[sorted.length - 1].period) - parseInt(sorted[0].period);
    if (earlyRev > 0 && latestRev > earlyRev && years > 0) revenueCAGR = Math.pow(latestRev / earlyRev, 1 / years) - 1;
  }

  let yoyGrowthRate: number | null = null;
  if (inputs.previousArr > 0 && inputs.arr > 0) yoyGrowthRate = (inputs.arr - inputs.previousArr) / inputs.previousArr;
  else if (revenueCAGR !== null) yoyGrowthRate = revenueCAGR;

  let ruleOf40: number | null = null;
  if (yoyGrowthRate !== null && inputs.grossMargin > 0) {
    const profitMargin = effectiveArr > 0 && inputs.burnRate !== 0
      ? (effectiveArr - Math.abs(inputs.burnRate) * 12) / effectiveArr : inputs.grossMargin - 0.3;
    ruleOf40 = (yoyGrowthRate * 100) + (profitMargin * 100);
  }

  let forwardMultiple: number | null = null;
  const growthForProjection = revenueCAGR ?? yoyGrowthRate;
  if (inputs.valuation > 0 && effectiveArr > 0 && growthForProjection !== null && growthForProjection > 0)
    forwardMultiple = inputs.valuation / (effectiveArr * Math.pow(1 + growthForProjection, 2));

  const sectorMedianEvRevenue = sectorBenchmarks?.evRevenueMedian ?? null;
  const sectorMedianEvEbitda = sectorBenchmarks?.evEbitdaMedian ?? null;

  // 1. ARR Score
  let arrScore = 0;
  if (effectiveArr > 0) {
    arrScore = Math.round(percentileRank(peerArrDistribution, effectiveArr));
    if (effectiveArr >= 1e9) arrScore = Math.min(100, arrScore + 10);
    else if (effectiveArr >= 1e8) arrScore = Math.min(100, arrScore + 5);
  }

  // 2. Valuation Score
  let valuationScore = 50;
  if (inputs.valuation > 0 && effectiveArr > 0) {
    const multiple = inputs.valuation / effectiveArr;
    if (sectorMedianEvRevenue && sectorMedianEvRevenue > 0) {
      const rel = multiple / sectorMedianEvRevenue;
      if (rel <= 0.5) valuationScore = 98; else if (rel <= 0.75) valuationScore = 88;
      else if (rel <= 1.0) valuationScore = 74; else if (rel <= 1.3) valuationScore = 62;
      else if (rel <= 1.7) valuationScore = 48; else if (rel <= 2.5) valuationScore = 32;
      else valuationScore = 15;
    } else {
      const stageMul = inputs.stage?.toLowerCase().includes('series a') ? 1.5 :
        inputs.stage?.toLowerCase().includes('series b') ? 1.3 :
        inputs.stage?.toLowerCase().includes('series c') ? 1.15 :
        inputs.stage?.toLowerCase().includes('growth') ? 0.9 : 1.0;
      let adj = multiple / stageMul;
      if (yoyGrowthRate !== null && yoyGrowthRate > 0) adj = adj / Math.min(2.0, 1 + yoyGrowthRate);
      if (adj <= 5) valuationScore = 98; else if (adj <= 10) valuationScore = 88;
      else if (adj <= 18) valuationScore = 74; else if (adj <= 30) valuationScore = 58;
      else if (adj <= 50) valuationScore = 42; else if (adj <= 80) valuationScore = 28;
      else valuationScore = 15;
    }
    if (evEbitda !== null && sectorMedianEvEbitda && sectorMedianEvEbitda > 0) {
      const eRel = evEbitda / sectorMedianEvEbitda;
      const eScore = eRel <= 0.5 ? 95 : eRel <= 0.75 ? 82 : eRel <= 1.0 ? 68 : eRel <= 1.5 ? 48 : 22;
      valuationScore = Math.round(valuationScore * 0.65 + eScore * 0.35);
    }
    if (forwardMultiple !== null && forwardMultiple < 10) valuationScore = Math.min(100, valuationScore + 8);
  }

  // 3. Growth Score
  let growthScore = 50;
  const gm = revenueCAGR ?? yoyGrowthRate;
  if (gm !== null) {
    if (gm >= 3.0) growthScore = 100; else if (gm >= 2.0) growthScore = 95;
    else if (gm >= 1.0) growthScore = 85; else if (gm >= 0.5) growthScore = 72;
    else if (gm >= 0.3) growthScore = 58; else if (gm >= 0.15) growthScore = 42;
    else if (gm >= 0) growthScore = 28; else growthScore = 10;
  }

  // 4. Sector Momentum
  let sectorMomentum = 50;
  if (inputs.sector && sectorBenchmarks) {
    const ds = Math.min(100, (sectorBenchmarks.dealCount12m / 5) * 100);
    const fs = Math.min(100, (sectorBenchmarks.fundingCount12m / 10) * 100);
    const ts = Math.min(100, (sectorBenchmarks.evRevenueCount / 8) * 100);
    sectorMomentum = Math.round(ds * 0.4 + fs * 0.35 + ts * 0.25);
  } else if (inputs.sector) {
    const hot = ['AI/ML', 'Cybersecurity', 'Data Infrastructure', 'Developer Tools', 'Defense Tech', 'Cloud Infrastructure'];
    const cool = ['Crypto/Web3', 'Consumer'];
    if (hot.includes(inputs.sector)) sectorMomentum = 75;
    else if (cool.includes(inputs.sector)) sectorMomentum = 30;
  }

  // 5. Efficiency
  let efficiencyScore = 50;
  const scores: number[] = [];
  if (inputs.grossMargin > 0) scores.push(inputs.grossMargin >= 0.85 ? 95 : inputs.grossMargin >= 0.75 ? 80 : inputs.grossMargin >= 0.65 ? 65 : inputs.grossMargin >= 0.50 ? 45 : 25);
  if (inputs.employeeCount && effectiveArr > 0) {
    const rpe = effectiveArr / inputs.employeeCount;
    scores.push(rpe >= 500000 ? 95 : rpe >= 300000 ? 80 : rpe >= 200000 ? 65 : rpe >= 100000 ? 45 : 15);
  }
  if (ruleOf40 !== null) scores.push(ruleOf40 >= 80 ? 98 : ruleOf40 >= 60 ? 88 : ruleOf40 >= 40 ? 72 : ruleOf40 >= 20 ? 50 : 12);
  if (scores.length > 0) efficiencyScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // 6. Capital Efficiency
  let capitalEfficiency = 50;
  if (inputs.burnRate !== 0 && effectiveArr > 0) {
    const bm = Math.abs(inputs.burnRate) / (effectiveArr / 12);
    if (inputs.burnRate > 0) capitalEfficiency = 98;
    else if (bm <= 1) capitalEfficiency = 88; else if (bm <= 2) capitalEfficiency = 72;
    else if (bm <= 3) capitalEfficiency = 55; else if (bm <= 5) capitalEfficiency = 38;
    else capitalEfficiency = 18;
  }
  if (inputs.runwayMonths > 0) {
    const rs = inputs.runwayMonths >= 36 ? 90 : inputs.runwayMonths >= 24 ? 75 : inputs.runwayMonths >= 18 ? 55 : inputs.runwayMonths >= 12 ? 35 : 15;
    capitalEfficiency = Math.round((capitalEfficiency + rs) / 2);
  }

  const overall = Math.round(
    arrScore * WEIGHTS.scale + valuationScore * WEIGHTS.valuation + growthScore * WEIGHTS.growth +
    sectorMomentum * WEIGHTS.sectorMomentum + efficiencyScore * WEIGHTS.efficiency + capitalEfficiency * WEIGHTS.capitalEfficiency
  );
  const { grade, color } = getGrade(overall);

  if (overall >= 80) insights.unshift("Strong investment candidate");
  else if (overall >= 60) insights.unshift("Solid fundamentals with upside potential");
  else if (overall < 35) insights.unshift("Significant risk factors present");

  const factors = [
    { factor: "ARR / Revenue Scale", rawScore: arrScore, weight: WEIGHTS.scale, weightedContribution: Math.round(arrScore * WEIGHTS.scale * 100) / 100 },
    { factor: "Valuation (Sector-Adj)", rawScore: valuationScore, weight: WEIGHTS.valuation, weightedContribution: Math.round(valuationScore * WEIGHTS.valuation * 100) / 100 },
    { factor: "Growth Trajectory", rawScore: growthScore, weight: WEIGHTS.growth, weightedContribution: Math.round(growthScore * WEIGHTS.growth * 100) / 100 },
    { factor: "Sector Momentum", rawScore: sectorMomentum, weight: WEIGHTS.sectorMomentum, weightedContribution: Math.round(sectorMomentum * WEIGHTS.sectorMomentum * 100) / 100 },
    { factor: "Operational Efficiency", rawScore: efficiencyScore, weight: WEIGHTS.efficiency, weightedContribution: Math.round(efficiencyScore * WEIGHTS.efficiency * 100) / 100 },
    { factor: "Capital Efficiency", rawScore: capitalEfficiency, weight: WEIGHTS.capitalEfficiency, weightedContribution: Math.round(capitalEfficiency * WEIGHTS.capitalEfficiency * 100) / 100 },
  ];

  return {
    overall, arrScore, valuationScore, sectorMomentum, efficiencyScore,
    growthScore, capitalEfficiency, ruleOf40, revenueCAGR, impliedMultiple,
    forwardMultiple, evEbitda, sectorMedianEvRevenue, sectorMedianEvEbitda,
    grade, color, insights: insights.slice(0, 5),
    explainability: {
      modelVersion: MODEL_VERSION, weights: { ...WEIGHTS }, factors, confidenceAdjustments,
      inputQualityFlags, benchmarkCohort: { peerCount: peerArrDistribution.length, sectorMedianEvRevenue, sectorMedianEvEbitda },
    },
  };
}

// ─── Rate Limiting ───
async function checkRateLimit(supabase: any, identifier: string, endpoint: string, maxReq = 30, windowMin = 1) {
  const windowStart = new Date(Math.floor(Date.now() / (windowMin * 60000)) * (windowMin * 60000)).toISOString();
  const { data } = await supabase
    .from("rate_limits")
    .select("request_count")
    .eq("identifier", identifier)
    .eq("endpoint", endpoint)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (data && data.request_count >= maxReq) {
    return { allowed: false, remaining: 0 };
  }

  await supabase.from("rate_limits").upsert({
    identifier, endpoint, window_start: windowStart,
    request_count: (data?.request_count ?? 0) + 1,
  }, { onConflict: "identifier,endpoint,window_start" });

  return { allowed: true, remaining: maxReq - (data?.request_count ?? 0) - 1 };
}

// ─── Edge Function Handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { companyIds, snapshot = false, decisionContext } = await req.json();
    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return new Response(JSON.stringify({ error: "companyIds array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit by caller
    const authHeader = req.headers.get("authorization") ?? "";
    const callerId = authHeader.slice(0, 20) || "anon";
    const rateCheck = await checkRateLimit(supabase, callerId, "compute-scores", 30, 1);
    if (!rateCheck.allowed) {
      await supabase.from("api_telemetry").insert({
        function_name: "compute-scores", method: "POST", status_code: 429,
        latency_ms: Date.now() - start,
      });
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const ids = companyIds.slice(0, 50);

    // Use pre-computed MV for company + financials + funding in single query
    const { data: precomputed } = await supabase
      .from("mv_company_scores")
      .select("*")
      .in("company_id", ids);

    // Still need sector multiples and ARR distribution
    const [sectorMultRes, allArrRes] = await Promise.all([
      supabase.from("mv_sector_multiples").select("*"),
      supabase.from("mv_company_scores").select("latest_arr, latest_revenue"),
    ]);

    const sectorMultiples = sectorMultRes.data ?? [];
    const allARR = (allArrRes.data ?? [])
      .map((f: any) => f.latest_arr ?? f.latest_revenue ?? 0)
      .filter((a: number) => a > 0)
      .sort((a: number, b: number) => a - b);

    const sectorMultMap: Record<string, SectorBenchmarks> = {};
    sectorMultiples.forEach((sm: any) => {
      sectorMultMap[sm.sector] = {
        evRevenueMedian: sm.ev_rev_median ?? 0,
        evEbitdaMedian: sm.ev_ebitda_median ?? 0,
        dealCount12m: sm.deal_count_12m ?? 0,
        fundingCount12m: sm.funding_count_12m ?? 0,
        evRevenueCount: sm.ev_rev_count ?? 0,
      };
    });

    // For historical data, batch query financials only for requested companies
    const { data: historicalFins } = await supabase
      .from("financials")
      .select("company_id, period, arr, revenue")
      .in("company_id", ids)
      .order("period", { ascending: false })
      .limit(ids.length * 10); // ~10 periods per company max

    const histByCompany: Record<string, any[]> = {};
    (historicalFins ?? []).forEach((f: any) => {
      if (!histByCompany[f.company_id]) histByCompany[f.company_id] = [];
      histByCompany[f.company_id].push(f);
    });

    const results: Record<string, any> = {};
    const snapshots: any[] = [];

    for (const row of (precomputed ?? [])) {
      const fins = histByCompany[row.company_id] ?? [];
      const previous = fins[1];

      const companyInputs: CompanyInputs = {
        sector: row.sector, stage: row.stage, employeeCount: row.employee_count,
        arr: row.latest_arr ?? 0, revenue: row.latest_revenue ?? 0,
        ebitda: row.latest_ebitda ?? 0, valuation: row.latest_valuation ?? 0,
        grossMargin: row.gross_margin ?? 0, burnRate: row.burn_rate ?? 0,
        runwayMonths: row.runway_months ? Number(row.runway_months) : 0,
        previousArr: previous?.arr ?? 0,
        historicals: fins.map((f: any) => ({ period: f.period, arr: f.arr, revenue: f.revenue })),
      };

      const benchmarks = row.sector ? sectorMultMap[row.sector] ?? null : null;
      const result = computeValuationScore(companyInputs, allARR, benchmarks);
      results[row.company_id] = result;

      if (snapshot) {
        snapshots.push({
          company_id: row.company_id, model_version: MODEL_VERSION,
          model_config: { weights: WEIGHTS, gradeMap: GRADE_MAP },
          inputs: companyInputs,
          outputs: {
            overall: result.overall, grade: result.grade, arrScore: result.arrScore,
            valuationScore: result.valuationScore, growthScore: result.growthScore,
            sectorMomentum: result.sectorMomentum, efficiencyScore: result.efficiencyScore,
            capitalEfficiency: result.capitalEfficiency,
          },
          explainability: result.explainability,
          triggered_by: decisionContext ? "ic_decision" : "api",
          decision_context: decisionContext ?? null,
        });
      }
    }

    if (snapshots.length > 0) {
      const { error: snapErr } = await supabase.from("score_snapshots").insert(snapshots);
      if (snapErr) console.error("Snapshot persistence error:", snapErr);
    }

    const latencyMs = Date.now() - start;

    // Record telemetry
    await supabase.from("api_telemetry").insert({
      function_name: "compute-scores", method: "POST", status_code: 200,
      latency_ms: latencyMs, response_size_bytes: JSON.stringify(results).length,
      metadata: { company_count: ids.length },
    });

    return new Response(JSON.stringify(results), {
      headers: {
        ...corsHeaders, "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
        "X-Latency-Ms": String(latencyMs),
        "X-Rate-Remaining": String(rateCheck.remaining),
      },
    });
  } catch (error) {
    const latencyMs = Date.now() - start;
    await supabase.from("api_telemetry").insert({
      function_name: "compute-scores", method: "POST", status_code: 500,
      latency_ms: latencyMs, error_message: error instanceof Error ? error.message : "Unknown",
    }).catch(() => {});

    console.error("Compute scores error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
