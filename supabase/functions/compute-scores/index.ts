import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- Scoring logic (moved from client) ----------

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

interface CompanyFinancials {
  arr: number;
  revenue: number;
  ebitda: number;
  grossMargin: number;
  burnRate: number;
  runwayMonths: number;
}

interface SectorMultiples {
  ev_rev_median: number;
  ev_ebitda_median: number;
  deal_count_12m: number;
  funding_count_12m: number;
  ev_rev_count: number;
}

function computeScore(
  companyData: {
    sector: string | null;
    stage: string | null;
    employee_count: number | null;
    valuation: number;
    financials: CompanyFinancials;
    previousArr: number;
    historicals: { period: string; arr: number | null; revenue: number | null }[];
  },
  allARR: number[],
  sectorMult: SectorMultiples | null
) {
  const { financials, valuation, historicals } = companyData;
  const effectiveArr = financials.arr > 0 ? financials.arr : financials.revenue;
  const insights: string[] = [];

  // Implied multiples
  let impliedMultiple: number | null = null;
  let evEbitda: number | null = null;
  if (valuation > 0 && effectiveArr > 0) impliedMultiple = valuation / effectiveArr;
  if (valuation > 0 && financials.ebitda > 0) evEbitda = valuation / financials.ebitda;

  // CAGR
  let revenueCAGR: number | null = null;
  if (historicals.length >= 2) {
    const sorted = [...historicals].sort((a, b) => a.period.localeCompare(b.period));
    const earlyRev = sorted[0].arr ?? sorted[0].revenue ?? 0;
    const latestRev = sorted[sorted.length - 1].arr ?? sorted[sorted.length - 1].revenue ?? 0;
    const years = parseInt(sorted[sorted.length - 1].period) - parseInt(sorted[0].period);
    if (earlyRev > 0 && latestRev > earlyRev && years > 0) {
      revenueCAGR = Math.pow(latestRev / earlyRev, 1 / years) - 1;
    }
  }

  // YoY growth / Rule of 40
  let yoyGrowthRate: number | null = null;
  if (companyData.previousArr > 0 && financials.arr > 0) {
    yoyGrowthRate = (financials.arr - companyData.previousArr) / companyData.previousArr;
  } else if (revenueCAGR !== null) {
    yoyGrowthRate = revenueCAGR;
  }

  let ruleOf40: number | null = null;
  if (yoyGrowthRate !== null && financials.grossMargin > 0) {
    const profitMargin = effectiveArr > 0 && financials.burnRate !== 0
      ? (effectiveArr - Math.abs(financials.burnRate) * 12) / effectiveArr
      : financials.grossMargin - 0.3;
    ruleOf40 = (yoyGrowthRate * 100) + (profitMargin * 100);
  }

  // Forward multiple
  let forwardMultiple: number | null = null;
  const growthForProjection = revenueCAGR ?? yoyGrowthRate;
  if (valuation > 0 && effectiveArr > 0 && growthForProjection !== null && growthForProjection > 0) {
    forwardMultiple = valuation / (effectiveArr * Math.pow(1 + growthForProjection, 2));
  }

  const sectorMedianEvRevenue = sectorMult?.ev_rev_median ?? null;
  const sectorMedianEvEbitda = sectorMult?.ev_ebitda_median ?? null;

  // 1. ARR Score
  let arrScore = 0;
  if (effectiveArr > 0) {
    arrScore = Math.round(percentileRank(allARR, effectiveArr));
    if (effectiveArr >= 1e9) { arrScore = Math.min(100, arrScore + 10); insights.push("$1B+ ARR — elite scale"); }
    else if (effectiveArr >= 1e8) { arrScore = Math.min(100, arrScore + 5); insights.push("$100M+ ARR milestone"); }
  }

  // 2. Valuation Score
  let valuationScore = 50;
  if (valuation > 0 && effectiveArr > 0) {
    const multiple = valuation / effectiveArr;
    if (sectorMedianEvRevenue && sectorMedianEvRevenue > 0) {
      const rel = multiple / sectorMedianEvRevenue;
      if (rel <= 0.5) { valuationScore = 98; insights.push(`Trading at ${Math.round(rel * 100)}% of sector median`); }
      else if (rel <= 0.75) valuationScore = 88;
      else if (rel <= 1.0) valuationScore = 74;
      else if (rel <= 1.3) valuationScore = 62;
      else if (rel <= 1.7) valuationScore = 48;
      else if (rel <= 2.5) valuationScore = 32;
      else { valuationScore = 15; insights.push(`Premium at ${rel.toFixed(1)}x sector median`); }
    } else {
      const stageMul = companyData.stage?.toLowerCase().includes('series a') ? 1.5 :
        companyData.stage?.toLowerCase().includes('series b') ? 1.3 :
        companyData.stage?.toLowerCase().includes('series c') ? 1.15 :
        companyData.stage?.toLowerCase().includes('growth') ? 0.9 : 1.0;
      let adj = multiple / stageMul;
      if (yoyGrowthRate !== null && yoyGrowthRate > 0) adj = adj / Math.min(2.0, 1 + yoyGrowthRate);
      if (adj <= 5) valuationScore = 98; else if (adj <= 10) valuationScore = 88;
      else if (adj <= 18) valuationScore = 74; else if (adj <= 30) valuationScore = 58;
      else if (adj <= 50) valuationScore = 42; else if (adj <= 80) valuationScore = 28;
      else valuationScore = 15;
    }
    if (evEbitda !== null && sectorMedianEvEbitda && sectorMedianEvEbitda > 0) {
      const eRel = evEbitda / sectorMedianEvEbitda;
      let eScore = eRel <= 0.5 ? 95 : eRel <= 0.75 ? 82 : eRel <= 1.0 ? 68 : eRel <= 1.5 ? 48 : 22;
      valuationScore = Math.round(valuationScore * 0.65 + eScore * 0.35);
    }
    if (forwardMultiple !== null && forwardMultiple < 10) {
      valuationScore = Math.min(100, valuationScore + 8);
      insights.push(`${forwardMultiple.toFixed(1)}x forward multiple — attractive entry`);
    }
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
  if (sectorMult) {
    const ds = Math.min(100, (sectorMult.deal_count_12m / 5) * 100);
    const fs = Math.min(100, (sectorMult.funding_count_12m / 10) * 100);
    const ts = Math.min(100, (sectorMult.ev_rev_count / 8) * 100);
    sectorMomentum = Math.round(ds * 0.4 + fs * 0.35 + ts * 0.25);
    if (sectorMomentum >= 70) insights.push(`${companyData.sector} — strong deal activity`);
  }

  // 5. Efficiency Score
  let efficiencyScore = 50;
  const scores: number[] = [];
  if (financials.grossMargin > 0) {
    scores.push(financials.grossMargin >= 0.85 ? 95 : financials.grossMargin >= 0.75 ? 80 : financials.grossMargin >= 0.65 ? 65 : financials.grossMargin >= 0.50 ? 45 : 25);
  }
  if (companyData.employee_count && effectiveArr > 0) {
    const rpe = effectiveArr / companyData.employee_count;
    scores.push(rpe >= 500000 ? 95 : rpe >= 300000 ? 80 : rpe >= 200000 ? 65 : rpe >= 100000 ? 45 : 15);
  }
  if (ruleOf40 !== null) {
    scores.push(ruleOf40 >= 80 ? 98 : ruleOf40 >= 60 ? 88 : ruleOf40 >= 40 ? 72 : ruleOf40 >= 20 ? 50 : 12);
  }
  if (scores.length > 0) efficiencyScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // 6. Capital Efficiency
  let capitalEfficiency = 50;
  if (financials.burnRate !== 0 && effectiveArr > 0) {
    const bm = Math.abs(financials.burnRate) / (effectiveArr / 12);
    if (financials.burnRate > 0) capitalEfficiency = 98;
    else if (bm <= 1) capitalEfficiency = 88; else if (bm <= 2) capitalEfficiency = 72;
    else if (bm <= 3) capitalEfficiency = 55; else if (bm <= 5) capitalEfficiency = 38;
    else capitalEfficiency = 18;
  }
  if (financials.runwayMonths > 0) {
    const rs = financials.runwayMonths >= 36 ? 90 : financials.runwayMonths >= 24 ? 75 : financials.runwayMonths >= 18 ? 55 : financials.runwayMonths >= 12 ? 35 : 15;
    capitalEfficiency = Math.round((capitalEfficiency + rs) / 2);
  }

  const overall = Math.round(
    arrScore * 0.18 + valuationScore * 0.22 + growthScore * 0.18 +
    sectorMomentum * 0.12 + efficiencyScore * 0.15 + capitalEfficiency * 0.15
  );
  const { grade, color } = getGrade(overall);

  if (overall >= 80) insights.unshift("Strong investment candidate");
  else if (overall >= 60) insights.unshift("Solid fundamentals with upside potential");
  else if (overall < 35) insights.unshift("Significant risk factors present");

  return {
    overall, arrScore, valuationScore, sectorMomentum, efficiencyScore,
    growthScore, capitalEfficiency, ruleOf40, revenueCAGR, impliedMultiple,
    forwardMultiple, evEbitda, sectorMedianEvRevenue, sectorMedianEvEbitda,
    grade, color, insights: insights.slice(0, 5),
  };
}

// ---------- Edge function handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyIds } = await req.json();
    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return new Response(JSON.stringify({ error: "companyIds array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap at 50 companies per request
    const ids = companyIds.slice(0, 50);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Batch fetch all needed data in parallel
    const [companiesRes, financialsRes, fundingRes, sectorMultRes, allArrRes] = await Promise.all([
      supabase.from("companies").select("id, name, sector, stage, employee_count").in("id", ids),
      supabase.from("financials").select("company_id, period, arr, revenue, ebitda, gross_margin, burn_rate, runway_months").in("company_id", ids).order("period", { ascending: false }),
      supabase.from("funding_rounds").select("company_id, valuation_post, amount, date").in("company_id", ids).order("date", { ascending: false }),
      supabase.from("mv_sector_multiples").select("*"),
      supabase.from("financials").select("arr, revenue").not("arr", "is", null),
    ]);

    const companies = companiesRes.data ?? [];
    const financials = financialsRes.data ?? [];
    const funding = fundingRes.data ?? [];
    const sectorMultiples = sectorMultRes.data ?? [];
    
    // Build global ARR distribution for percentile ranking
    const allARR = (allArrRes.data ?? [])
      .map((f: any) => f.arr ?? f.revenue ?? 0)
      .filter((a: number) => a > 0)
      .sort((a: number, b: number) => a - b);

    // Index sector multiples
    const sectorMultMap: Record<string, SectorMultiples> = {};
    sectorMultiples.forEach((sm: any) => { sectorMultMap[sm.sector] = sm; });

    // Index financials by company (latest first)
    const finByCompany: Record<string, typeof financials> = {};
    financials.forEach(f => {
      if (!finByCompany[f.company_id]) finByCompany[f.company_id] = [];
      finByCompany[f.company_id].push(f);
    });

    // Index funding by company
    const fundByCompany: Record<string, typeof funding> = {};
    funding.forEach(f => {
      if (!fundByCompany[f.company_id]) fundByCompany[f.company_id] = [];
      fundByCompany[f.company_id].push(f);
    });

    // Compute scores
    const results: Record<string, any> = {};
    for (const company of companies) {
      const fins = finByCompany[company.id] ?? [];
      const funs = fundByCompany[company.id] ?? [];
      const latest = fins[0];
      const previous = fins[1];
      const latestRound = funs[0];

      results[company.id] = computeScore(
        {
          sector: company.sector,
          stage: company.stage,
          employee_count: company.employee_count,
          valuation: latestRound?.valuation_post ?? 0,
          financials: {
            arr: latest?.arr ?? 0,
            revenue: latest?.revenue ?? 0,
            ebitda: latest?.ebitda ?? 0,
            grossMargin: latest?.gross_margin ?? 0,
            burnRate: latest?.burn_rate ?? 0,
            runwayMonths: latest?.runway_months ? Number(latest.runway_months) : 0,
          },
          previousArr: previous?.arr ?? 0,
          historicals: fins.map(f => ({ period: f.period, arr: f.arr, revenue: f.revenue })),
        },
        allARR,
        company.sector ? sectorMultMap[company.sector] ?? null : null
      );
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    console.error("Compute scores error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
