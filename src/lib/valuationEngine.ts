/**
 * Valuation Engine v1.0.0
 *
 * Canonical scoring module extracted from inline hook/edge-function code.
 * All weights, thresholds, and grade maps are config-managed for auditability.
 */

// ─── Model Configuration ────────────────────────────────────────────────────

export const MODEL_VERSION = "v1.0.0";

export const WEIGHTS = {
  scale: 0.18,
  valuation: 0.22,
  growth: 0.18,
  sectorMomentum: 0.12,
  efficiency: 0.15,
  capitalEfficiency: 0.15,
} as const;

export const GRADE_MAP: { min: number; grade: string; color: string }[] = [
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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CompanyInputs {
  sector: string | null;
  stage: string | null;
  employeeCount: number | null;
  arr: number;
  revenue: number;
  ebitda: number;
  valuation: number;
  grossMargin: number;
  burnRate: number;
  runwayMonths: number;
  previousArr: number;
  historicals: { period: string; arr: number | null; revenue: number | null }[];
}

export interface SectorBenchmarks {
  evRevenueMedian: number;
  evEbitdaMedian: number;
  dealCount12m: number;
  fundingCount12m: number;
  evRevenueCount: number;
}

export interface FactorContribution {
  factor: string;
  rawScore: number;
  weight: number;
  weightedContribution: number;
  confidenceNote: string;
  benchmarkRef: string;
}

export interface Explainability {
  modelVersion: string;
  weights: typeof WEIGHTS;
  factors: FactorContribution[];
  confidenceAdjustments: string[];
  benchmarkCohort: {
    peerCount: number;
    sectorMedianEvRevenue: number | null;
    sectorMedianEvEbitda: number | null;
  };
  inputQualityFlags: string[];
}

export interface ScoreResult {
  overall: number;
  arrScore: number;
  valuationScore: number;
  sectorMomentum: number;
  efficiencyScore: number;
  growthScore: number;
  capitalEfficiency: number;
  ruleOf40: number | null;
  revenueCAGR: number | null;
  impliedMultiple: number | null;
  forwardMultiple: number | null;
  evEbitda: number | null;
  sectorMedianEvRevenue: number | null;
  sectorMedianEvEbitda: number | null;
  grade: string;
  color: string;
  insights: string[];
  explainability: Explainability;
}

// ─── Utility Functions ──────────────────────────────────────────────────────

export const getGrade = (score: number) => {
  const g = GRADE_MAP.find((g) => score >= g.min) ?? GRADE_MAP[GRADE_MAP.length - 1];
  return { grade: g.grade, color: g.color };
};

export const percentileRank = (sortedArr: number[], value: number): number => {
  if (sortedArr.length === 0 || value <= 0) return 0;
  const rank = sortedArr.filter((a) => a <= value).length;
  return (rank / sortedArr.length) * 100;
};

// ─── Core Scoring Engine ────────────────────────────────────────────────────

export function computeValuationScore(
  inputs: CompanyInputs,
  peerArrDistribution: number[],
  sectorBenchmarks: SectorBenchmarks | null
): ScoreResult {
  const effectiveArr = inputs.arr > 0 ? inputs.arr : inputs.revenue;
  const insights: string[] = [];
  const inputQualityFlags: string[] = [];
  const confidenceAdjustments: string[] = [];

  // ── Input quality assessment ──
  if (inputs.arr <= 0 && inputs.revenue <= 0) inputQualityFlags.push("No ARR or revenue data — scale score defaults to 0");
  if (inputs.arr <= 0 && inputs.revenue > 0) inputQualityFlags.push("ARR missing — using revenue as proxy");
  if (inputs.valuation <= 0) inputQualityFlags.push("No valuation data — valuation score defaults to 50");
  if (inputs.historicals.length < 2) inputQualityFlags.push("Insufficient historical periods for CAGR — growth based on YoY only");
  if (inputs.grossMargin <= 0) inputQualityFlags.push("Gross margin missing — efficiency score partially estimated");
  if (!sectorBenchmarks || sectorBenchmarks.evRevenueMedian <= 0) {
    inputQualityFlags.push("No sector benchmark data — valuation scored on absolute thresholds");
    confidenceAdjustments.push("Sector-relative scoring unavailable; absolute thresholds applied with lower confidence");
  }

  // ── Computed multiples ──
  let impliedMultiple: number | null = null;
  let evEbitda: number | null = null;
  if (inputs.valuation > 0 && effectiveArr > 0) impliedMultiple = inputs.valuation / effectiveArr;
  if (inputs.valuation > 0 && inputs.ebitda > 0) evEbitda = inputs.valuation / inputs.ebitda;

  // ── Multi-year CAGR ──
  let revenueCAGR: number | null = null;
  if (inputs.historicals.length >= 2) {
    const sorted = [...inputs.historicals].sort((a, b) => a.period.localeCompare(b.period));
    const earlyRev = sorted[0].arr ?? sorted[0].revenue ?? 0;
    const latestRev = sorted[sorted.length - 1].arr ?? sorted[sorted.length - 1].revenue ?? 0;
    const years = parseInt(sorted[sorted.length - 1].period) - parseInt(sorted[0].period);
    if (earlyRev > 0 && latestRev > earlyRev && years > 0) {
      revenueCAGR = Math.pow(latestRev / earlyRev, 1 / years) - 1;
    }
  }

  // ── YoY growth & Rule of 40 ──
  let yoyGrowthRate: number | null = null;
  if (inputs.previousArr > 0 && inputs.arr > 0) {
    yoyGrowthRate = (inputs.arr - inputs.previousArr) / inputs.previousArr;
  } else if (revenueCAGR !== null) {
    yoyGrowthRate = revenueCAGR;
  }

  let ruleOf40: number | null = null;
  if (yoyGrowthRate !== null && inputs.grossMargin > 0) {
    const profitMargin = effectiveArr > 0 && inputs.burnRate !== 0
      ? (effectiveArr - Math.abs(inputs.burnRate) * 12) / effectiveArr
      : inputs.grossMargin - 0.3;
    ruleOf40 = (yoyGrowthRate * 100) + (profitMargin * 100);
  }

  // ── Forward multiple ──
  let forwardMultiple: number | null = null;
  const growthForProjection = revenueCAGR ?? yoyGrowthRate;
  if (inputs.valuation > 0 && effectiveArr > 0 && growthForProjection !== null && growthForProjection > 0) {
    forwardMultiple = inputs.valuation / (effectiveArr * Math.pow(1 + growthForProjection, 2));
  }

  const sectorMedianEvRevenue = sectorBenchmarks?.evRevenueMedian ?? null;
  const sectorMedianEvEbitda = sectorBenchmarks?.evEbitdaMedian ?? null;

  // ── 1. ARR/Revenue Scale Score (0-100) ──
  let arrScore = 0;
  if (effectiveArr > 0) {
    arrScore = Math.round(percentileRank(peerArrDistribution, effectiveArr));
    if (effectiveArr >= 1e9) { arrScore = Math.min(100, arrScore + 10); insights.push("$1B+ ARR — elite scale"); }
    else if (effectiveArr >= 1e8) { arrScore = Math.min(100, arrScore + 5); insights.push("$100M+ ARR milestone achieved"); }
  }

  // ── 2. Valuation Score (0-100) ──
  let valuationScore = 50;
  if (inputs.valuation > 0 && effectiveArr > 0) {
    const multiple = inputs.valuation / effectiveArr;
    if (sectorMedianEvRevenue && sectorMedianEvRevenue > 0) {
      const rel = multiple / sectorMedianEvRevenue;
      if (rel <= 0.5) { valuationScore = 98; insights.push(`Trading at ${Math.round(rel * 100)}% of sector median EV/Revenue — deep value`); }
      else if (rel <= 0.75) valuationScore = 88;
      else if (rel <= 1.0) valuationScore = 74;
      else if (rel <= 1.3) valuationScore = 62;
      else if (rel <= 1.7) valuationScore = 48;
      else if (rel <= 2.5) valuationScore = 32;
      else { valuationScore = 15; insights.push(`Premium at ${rel.toFixed(1)}x sector median multiple`); }
    } else {
      const stageMul =
        inputs.stage?.toLowerCase().includes('series a') ? 1.5 :
        inputs.stage?.toLowerCase().includes('series b') ? 1.3 :
        inputs.stage?.toLowerCase().includes('series c') ? 1.15 :
        inputs.stage?.toLowerCase().includes('growth') ? 0.9 :
        inputs.stage?.toLowerCase().includes('public') ? 0.7 : 1.0;
      let adj = multiple / stageMul;
      if (yoyGrowthRate !== null && yoyGrowthRate > 0) adj = adj / Math.min(2.0, 1 + yoyGrowthRate);
      if (adj <= 5) { valuationScore = 98; insights.push("Deep value at current multiple"); }
      else if (adj <= 10) valuationScore = 88;
      else if (adj <= 18) valuationScore = 74;
      else if (adj <= 30) valuationScore = 58;
      else if (adj <= 50) valuationScore = 42;
      else if (adj <= 80) valuationScore = 28;
      else valuationScore = 15;
    }
    if (evEbitda !== null && sectorMedianEvEbitda && sectorMedianEvEbitda > 0) {
      const eRel = evEbitda / sectorMedianEvEbitda;
      const eScore = eRel <= 0.5 ? 95 : eRel <= 0.75 ? 82 : eRel <= 1.0 ? 68 : eRel <= 1.5 ? 48 : 22;
      valuationScore = Math.round(valuationScore * 0.65 + eScore * 0.35);
    }
    if (forwardMultiple !== null && forwardMultiple < 10) {
      valuationScore = Math.min(100, valuationScore + 8);
      insights.push(`${forwardMultiple.toFixed(1)}x forward multiple — attractive entry`);
    }
  }

  // ── 3. Growth Score (0-100) ──
  let growthScore = 50;
  const growthMetric = revenueCAGR ?? yoyGrowthRate;
  if (growthMetric !== null) {
    if (growthMetric >= 3.0) { growthScore = 100; insights.push(`${Math.round(growthMetric * 100)}% ${revenueCAGR !== null ? 'CAGR' : 'YoY'} — hypergrowth`); }
    else if (growthMetric >= 2.0) growthScore = 95;
    else if (growthMetric >= 1.0) { growthScore = 85; insights.push(`${Math.round(growthMetric * 100)}% ${revenueCAGR !== null ? 'CAGR' : 'YoY'} growth`); }
    else if (growthMetric >= 0.5) growthScore = 72;
    else if (growthMetric >= 0.3) growthScore = 58;
    else if (growthMetric >= 0.15) growthScore = 42;
    else if (growthMetric >= 0) growthScore = 28;
    else { growthScore = 10; insights.push("Revenue declining"); }
  }

  // ── 4. Sector Momentum (0-100) ──
  let sectorMomentum = 50;
  if (inputs.sector && sectorBenchmarks) {
    const ds = Math.min(100, (sectorBenchmarks.dealCount12m / 5) * 100);
    const fs = Math.min(100, (sectorBenchmarks.fundingCount12m / 10) * 100);
    const ts = Math.min(100, (sectorBenchmarks.evRevenueCount / 8) * 100);
    sectorMomentum = Math.round(ds * 0.4 + fs * 0.35 + ts * 0.25);
    if (sectorMomentum >= 70) insights.push(`${inputs.sector} — strong deal activity (${sectorBenchmarks.dealCount12m} deals, ${sectorBenchmarks.fundingCount12m} rounds in 12m)`);
  } else if (inputs.sector) {
    const hotSectors = ['AI/ML', 'Cybersecurity', 'Data Infrastructure', 'Developer Tools', 'Defense Tech', 'Cloud Infrastructure'];
    const coolingSectors = ['Crypto/Web3', 'Consumer'];
    if (hotSectors.includes(inputs.sector)) { sectorMomentum = 75; insights.push(`${inputs.sector} — high sector momentum`); }
    else if (coolingSectors.includes(inputs.sector)) sectorMomentum = 30;
  }

  // ── 5. Operational Efficiency (0-100) ──
  let efficiencyScore = 50;
  const subScores: number[] = [];
  if (inputs.grossMargin > 0) {
    const marginScore = inputs.grossMargin >= 0.85 ? 95 : inputs.grossMargin >= 0.75 ? 80 : inputs.grossMargin >= 0.65 ? 65 : inputs.grossMargin >= 0.50 ? 45 : inputs.grossMargin >= 0.30 ? 25 : 10;
    subScores.push(marginScore);
    if (inputs.grossMargin >= 0.80) insights.push(`${Math.round(inputs.grossMargin * 100)}% gross margin — software-like economics`);
  }
  if (inputs.employeeCount && inputs.employeeCount > 0 && effectiveArr > 0) {
    const revPerEmp = effectiveArr / inputs.employeeCount;
    const empScore = revPerEmp >= 500000 ? 95 : revPerEmp >= 300000 ? 80 : revPerEmp >= 200000 ? 65 : revPerEmp >= 100000 ? 45 : revPerEmp >= 50000 ? 30 : 15;
    subScores.push(empScore);
    if (revPerEmp >= 300000) insights.push(`$${Math.round(revPerEmp / 1000)}K rev/employee — capital efficient`);
  }
  if (ruleOf40 !== null) {
    const r40Score = ruleOf40 >= 80 ? 98 : ruleOf40 >= 60 ? 88 : ruleOf40 >= 40 ? 72 : ruleOf40 >= 20 ? 50 : ruleOf40 >= 0 ? 30 : 12;
    subScores.push(r40Score);
    if (ruleOf40 >= 40) insights.push(`Rule of 40: ${Math.round(ruleOf40)} — best-in-class`);
    else if (ruleOf40 < 20) insights.push(`Rule of 40: ${Math.round(ruleOf40)} — below threshold`);
  }
  if (subScores.length > 0) efficiencyScore = Math.round(subScores.reduce((a, b) => a + b, 0) / subScores.length);

  // ── 6. Capital Efficiency (0-100) ──
  let capitalEfficiency = 50;
  if (inputs.burnRate !== 0 && effectiveArr > 0) {
    const burnMultiple = Math.abs(inputs.burnRate) / (effectiveArr / 12);
    if (inputs.burnRate > 0) { capitalEfficiency = 98; insights.push("Cash flow positive"); }
    else if (burnMultiple <= 1) { capitalEfficiency = 88; insights.push("Near cash-flow positive"); }
    else if (burnMultiple <= 2) capitalEfficiency = 72;
    else if (burnMultiple <= 3) capitalEfficiency = 55;
    else if (burnMultiple <= 5) capitalEfficiency = 38;
    else { capitalEfficiency = 18; insights.push("High burn relative to revenue"); }
  }
  if (inputs.runwayMonths > 0) {
    const runwayScore = inputs.runwayMonths >= 36 ? 90 : inputs.runwayMonths >= 24 ? 75 : inputs.runwayMonths >= 18 ? 55 : inputs.runwayMonths >= 12 ? 35 : 15;
    capitalEfficiency = Math.round((capitalEfficiency + runwayScore) / 2);
    if (inputs.runwayMonths < 12) insights.push("⚠️ Less than 12 months runway");
  }

  // ── Overall Score ──
  const overall = Math.round(
    arrScore * WEIGHTS.scale +
    valuationScore * WEIGHTS.valuation +
    growthScore * WEIGHTS.growth +
    sectorMomentum * WEIGHTS.sectorMomentum +
    efficiencyScore * WEIGHTS.efficiency +
    capitalEfficiency * WEIGHTS.capitalEfficiency
  );

  const { grade, color } = getGrade(overall);

  if (overall >= 80) insights.unshift("Strong investment candidate");
  else if (overall >= 60) insights.unshift("Solid fundamentals with upside potential");
  else if (overall < 35) insights.unshift("Significant risk factors present");

  // ── Explainability ──
  const factors: FactorContribution[] = [
    {
      factor: "ARR / Revenue Scale",
      rawScore: arrScore,
      weight: WEIGHTS.scale,
      weightedContribution: Math.round(arrScore * WEIGHTS.scale * 100) / 100,
      confidenceNote: effectiveArr > 0 ? "Based on reported financials" : "No revenue data — scored at 0",
      benchmarkRef: `Percentile rank against ${peerArrDistribution.length} peers`,
    },
    {
      factor: "Valuation (Sector-Adj)",
      rawScore: valuationScore,
      weight: WEIGHTS.valuation,
      weightedContribution: Math.round(valuationScore * WEIGHTS.valuation * 100) / 100,
      confidenceNote: sectorMedianEvRevenue ? "Sector-relative scoring applied" : "Absolute threshold fallback (lower confidence)",
      benchmarkRef: sectorMedianEvRevenue ? `Sector median EV/Rev: ${sectorMedianEvRevenue.toFixed(1)}x` : "No sector benchmark available",
    },
    {
      factor: "Growth Trajectory",
      rawScore: growthScore,
      weight: WEIGHTS.growth,
      weightedContribution: Math.round(growthScore * WEIGHTS.growth * 100) / 100,
      confidenceNote: revenueCAGR !== null ? `Multi-year CAGR (${inputs.historicals.length} periods)` : yoyGrowthRate !== null ? "Single-period YoY growth" : "No growth data — default score",
      benchmarkRef: growthMetric !== null ? `${Math.round(growthMetric * 100)}% ${revenueCAGR !== null ? 'CAGR' : 'YoY'}` : "N/A",
    },
    {
      factor: "Sector Momentum",
      rawScore: sectorMomentum,
      weight: WEIGHTS.sectorMomentum,
      weightedContribution: Math.round(sectorMomentum * WEIGHTS.sectorMomentum * 100) / 100,
      confidenceNote: sectorBenchmarks ? "Based on live deal/funding activity" : "Heuristic sector classification",
      benchmarkRef: sectorBenchmarks ? `${sectorBenchmarks.dealCount12m} deals, ${sectorBenchmarks.fundingCount12m} rounds (12m)` : "No deal data",
    },
    {
      factor: "Operational Efficiency",
      rawScore: efficiencyScore,
      weight: WEIGHTS.efficiency,
      weightedContribution: Math.round(efficiencyScore * WEIGHTS.efficiency * 100) / 100,
      confidenceNote: subScores.length > 0 ? `Composite of ${subScores.length} sub-factors` : "Default score — insufficient data",
      benchmarkRef: ruleOf40 !== null ? `Rule of 40: ${Math.round(ruleOf40)}` : "Rule of 40 not computable",
    },
    {
      factor: "Capital Efficiency",
      rawScore: capitalEfficiency,
      weight: WEIGHTS.capitalEfficiency,
      weightedContribution: Math.round(capitalEfficiency * WEIGHTS.capitalEfficiency * 100) / 100,
      confidenceNote: inputs.burnRate !== 0 ? "Based on burn rate data" : "Default score — no burn data",
      benchmarkRef: inputs.runwayMonths > 0 ? `${inputs.runwayMonths} months runway` : "Runway unknown",
    },
  ];

  // Confidence adjustments for low-quality inputs
  if (inputQualityFlags.length >= 3) {
    confidenceAdjustments.push("Multiple input gaps detected — overall score confidence is reduced");
  }
  if (inputs.valuation <= 0) {
    confidenceAdjustments.push("Valuation unknown — 22% of score weight is at default (50)");
  }

  const explainability: Explainability = {
    modelVersion: MODEL_VERSION,
    weights: { ...WEIGHTS },
    factors,
    confidenceAdjustments,
    benchmarkCohort: {
      peerCount: peerArrDistribution.length,
      sectorMedianEvRevenue,
      sectorMedianEvEbitda,
    },
    inputQualityFlags,
  };

  return {
    overall, arrScore, valuationScore, sectorMomentum, efficiencyScore,
    growthScore, capitalEfficiency, ruleOf40, revenueCAGR, impliedMultiple,
    forwardMultiple, evEbitda, sectorMedianEvRevenue, sectorMedianEvEbitda,
    grade, color, insights: insights.slice(0, 5), explainability,
  };
}
