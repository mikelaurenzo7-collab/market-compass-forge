import { useMemo } from "react";
import { useCompaniesWithFinancials } from "@/hooks/useData";

export type CompanyScoreResult = {
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
  grade: string;
  color: string;
  insights: string[];
};

const GRADE_MAP: { min: number; grade: string; color: string }[] = [
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

export type HistoricalFinancial = {
  period: string;
  revenue: number | null;
  arr: number | null;
  gross_margin: number | null;
  burn_rate: number | null;
  runway_months: number | null;
};

export const useCompanyScore = (
  companyId: string,
  companyData?: {
    sector: string | null;
    stage: string | null;
    employee_count: number | null;
    arr?: number | null;
    revenue?: number | null;
    valuation?: number | null;
    grossMargin?: number | null;
    burnRate?: number | null;
    runwayMonths?: number | null;
    previousArr?: number | null;
    previousRevenue?: number | null;
    historicalFinancials?: HistoricalFinancial[];
  }
): CompanyScoreResult | null => {
  const { data: allCompanies } = useCompaniesWithFinancials();

  return useMemo(() => {
    if (!companyData || !allCompanies) return null;

    const arr = companyData.arr ?? 0;
    const revenue = companyData.revenue ?? arr;
    const valuation = companyData.valuation ?? 0;
    const grossMargin = companyData.grossMargin ?? 0;
    const sector = companyData.sector;
    const burnRate = companyData.burnRate ?? 0;
    const runwayMonths = companyData.runwayMonths ?? 0;
    const previousArr = companyData.previousArr ?? 0;
    const historicals = companyData.historicalFinancials ?? [];
    const effectiveArr = arr > 0 ? arr : revenue;
    const insights: string[] = [];

    // ── Multi-year CAGR calculation ──
    let revenueCAGR: number | null = null;
    if (historicals.length >= 2) {
      const sorted = [...historicals].sort((a, b) => a.period.localeCompare(b.period));
      const earliest = sorted[0];
      const latest = sorted[sorted.length - 1];
      const earlyRev = earliest.arr ?? earliest.revenue ?? 0;
      const latestRev = latest.arr ?? latest.revenue ?? 0;
      const years = parseInt(latest.period) - parseInt(earliest.period);
      if (earlyRev > 0 && latestRev > earlyRev && years > 0) {
        revenueCAGR = Math.pow(latestRev / earlyRev, 1 / years) - 1;
      }
    }

    // ── Rule of 40 ──
    let ruleOf40: number | null = null;
    let yoyGrowthRate: number | null = null;
    if (previousArr > 0 && arr > 0) {
      yoyGrowthRate = (arr - previousArr) / previousArr;
    } else if (revenueCAGR !== null) {
      yoyGrowthRate = revenueCAGR;
    }
    if (yoyGrowthRate !== null && grossMargin > 0) {
      // Approximate profit margin from gross margin and burn
      const profitMargin = effectiveArr > 0 && burnRate !== 0
        ? (effectiveArr - Math.abs(burnRate) * 12) / effectiveArr
        : grossMargin - 0.3; // approximate OpEx at 30% of revenue
      ruleOf40 = (yoyGrowthRate * 100) + (profitMargin * 100);
    }

    // ── Forward multiple (2-year projected) ──
    let forwardMultiple: number | null = null;
    const growthForProjection = revenueCAGR ?? (yoyGrowthRate ?? null);
    if (valuation > 0 && effectiveArr > 0 && growthForProjection !== null && growthForProjection > 0) {
      const projectedRevenue2Y = effectiveArr * Math.pow(1 + growthForProjection, 2);
      forwardMultiple = valuation / projectedRevenue2Y;
    }

    // ── Implied multiple ──
    let impliedMultiple: number | null = null;
    if (valuation > 0 && effectiveArr > 0) {
      impliedMultiple = valuation / effectiveArr;
    }

    // ── 1. ARR/Revenue Scale Score (0-100) ──
    const allARR = allCompanies
      .map((c) => c.latestFinancials?.arr ?? c.latestFinancials?.revenue ?? 0)
      .filter((a) => a > 0)
      .sort((a, b) => a - b);

    let arrScore = 0;
    if (effectiveArr > 0) {
      arrScore = Math.round(percentileRank(allARR, effectiveArr));
      if (effectiveArr >= 1000000000) { arrScore = Math.min(100, arrScore + 10); insights.push("$1B+ ARR — elite scale"); }
      else if (effectiveArr >= 100000000) { arrScore = Math.min(100, arrScore + 5); insights.push("$100M+ ARR milestone achieved"); }
    }

    // ── 2. Valuation Score (0-100) ──
    // Growth-adjusted: PEG-like approach using revenue multiple / growth rate
    let valuationScore = 50;
    if (valuation > 0 && effectiveArr > 0) {
      const multiple = valuation / effectiveArr;

      // Stage adjustment
      const stageMultiplier =
        companyData.stage?.toLowerCase().includes('series a') ? 1.5 :
        companyData.stage?.toLowerCase().includes('series b') ? 1.3 :
        companyData.stage?.toLowerCase().includes('series c') ? 1.15 :
        companyData.stage?.toLowerCase().includes('growth') ? 0.9 :
        companyData.stage?.toLowerCase().includes('public') ? 0.7 : 1.0;

      let adjustedMultiple = multiple / stageMultiplier;

      // Growth-adjusted scoring: if growing fast, higher multiples are justified
      if (yoyGrowthRate !== null && yoyGrowthRate > 0) {
        const growthPremium = Math.min(2.0, 1 + yoyGrowthRate); // cap at 2x
        adjustedMultiple = adjustedMultiple / growthPremium;
      }

      if (adjustedMultiple <= 5) { valuationScore = 98; insights.push("Deep value at current multiple"); }
      else if (adjustedMultiple <= 10) valuationScore = 88;
      else if (adjustedMultiple <= 18) valuationScore = 74;
      else if (adjustedMultiple <= 30) valuationScore = 58;
      else if (adjustedMultiple <= 50) valuationScore = 42;
      else if (adjustedMultiple <= 80) valuationScore = 28;
      else if (adjustedMultiple <= 120) valuationScore = 18;
      else { valuationScore = 8; insights.push("Premium valuation relative to growth-adjusted revenue"); }

      // Forward multiple bonus
      if (forwardMultiple !== null && forwardMultiple < 10) {
        valuationScore = Math.min(100, valuationScore + 8);
        insights.push(`${forwardMultiple.toFixed(1)}x forward multiple — attractive entry`);
      }
    }

    // ── 3. Growth Score (0-100) ──
    // Uses multi-year CAGR when available, falls back to YoY
    let growthScore = 50;
    const growthMetric = revenueCAGR ?? (yoyGrowthRate ?? null);
    if (growthMetric !== null) {
      if (growthMetric >= 3.0) { growthScore = 100; insights.push(`${Math.round(growthMetric * 100)}% ${revenueCAGR !== null ? 'CAGR' : 'YoY'} — hypergrowth`); }
      else if (growthMetric >= 2.0) { growthScore = 95; }
      else if (growthMetric >= 1.0) { growthScore = 85; insights.push(`${Math.round(growthMetric * 100)}% ${revenueCAGR !== null ? 'CAGR' : 'YoY'} growth`); }
      else if (growthMetric >= 0.5) growthScore = 72;
      else if (growthMetric >= 0.3) growthScore = 58;
      else if (growthMetric >= 0.15) growthScore = 42;
      else if (growthMetric >= 0) growthScore = 28;
      else { growthScore = 10; insights.push("Revenue declining"); }
    }

    // ── 4. Sector Momentum (0-100) ──
    let sectorMomentum = 50;
    if (sector) {
      const sectorCompanies = allCompanies.filter((c) => c.sector === sector);
      const sectorCount = sectorCompanies.length;
      const allSectors = Array.from(new Set(allCompanies.map((c) => c.sector).filter(Boolean)));
      const maxSectorCount = Math.max(...allSectors.map((s) => allCompanies.filter((c) => c.sector === s).length));

      const densityScore = (sectorCount / maxSectorCount) * 100;
      const hotSectors = ['AI/ML', 'Cybersecurity', 'Data Infrastructure', 'Developer Tools', 'Defense Tech', 'Cloud Infrastructure'];
      const hotBonus = hotSectors.includes(sector) ? 15 : 0;
      const coolingSectors = ['Crypto/Web3', 'Consumer'];
      const coolingPenalty = coolingSectors.includes(sector) ? -10 : 0;

      sectorMomentum = Math.max(0, Math.min(100, Math.round(densityScore * 0.7 + hotBonus + coolingPenalty + 20)));
      if (hotSectors.includes(sector)) insights.push(`${sector} — high sector momentum`);
    }

    // ── 5. Operational Efficiency (0-100) ──
    // Gross margin + rev/employee + Rule of 40
    let efficiencyScore = 50;
    const scores: number[] = [];

    if (grossMargin > 0) {
      const marginScore = grossMargin >= 0.85 ? 95 :
        grossMargin >= 0.75 ? 80 :
        grossMargin >= 0.65 ? 65 :
        grossMargin >= 0.50 ? 45 :
        grossMargin >= 0.30 ? 25 : 10;
      scores.push(marginScore);
      if (grossMargin >= 0.80) insights.push(`${Math.round(grossMargin * 100)}% gross margin — software-like economics`);
    }

    if (companyData.employee_count && companyData.employee_count > 0 && effectiveArr > 0) {
      const revPerEmp = effectiveArr / companyData.employee_count;
      const empScore = revPerEmp >= 500000 ? 95 :
        revPerEmp >= 300000 ? 80 :
        revPerEmp >= 200000 ? 65 :
        revPerEmp >= 100000 ? 45 :
        revPerEmp >= 50000 ? 30 : 15;
      scores.push(empScore);
      if (revPerEmp >= 300000) insights.push(`$${Math.round(revPerEmp / 1000)}K rev/employee — capital efficient`);
    }

    // Rule of 40 component
    if (ruleOf40 !== null) {
      const r40Score = ruleOf40 >= 80 ? 98 :
        ruleOf40 >= 60 ? 88 :
        ruleOf40 >= 40 ? 72 :
        ruleOf40 >= 20 ? 50 :
        ruleOf40 >= 0 ? 30 : 12;
      scores.push(r40Score);
      if (ruleOf40 >= 40) insights.push(`Rule of 40: ${Math.round(ruleOf40)} — best-in-class`);
      else if (ruleOf40 < 20) insights.push(`Rule of 40: ${Math.round(ruleOf40)} — below threshold`);
    }

    if (scores.length > 0) {
      efficiencyScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    // ── 6. Capital Efficiency (0-100) ──
    let capitalEfficiency = 50;
    if (burnRate !== 0 && effectiveArr > 0) {
      const burnMultiple = Math.abs(burnRate) / (effectiveArr / 12);
      if (burnRate > 0) { capitalEfficiency = 98; insights.push("Cash flow positive"); } // positive burn = generating cash
      else if (burnMultiple <= 1) { capitalEfficiency = 88; insights.push("Near cash-flow positive"); }
      else if (burnMultiple <= 2) capitalEfficiency = 72;
      else if (burnMultiple <= 3) capitalEfficiency = 55;
      else if (burnMultiple <= 5) capitalEfficiency = 38;
      else { capitalEfficiency = 18; insights.push("High burn relative to revenue"); }
    }
    if (runwayMonths > 0) {
      const runwayScore = runwayMonths >= 36 ? 90 :
        runwayMonths >= 24 ? 75 :
        runwayMonths >= 18 ? 55 :
        runwayMonths >= 12 ? 35 : 15;
      capitalEfficiency = Math.round((capitalEfficiency + runwayScore) / 2);
      if (runwayMonths < 12) insights.push("⚠️ Less than 12 months runway");
    }

    // ── Overall Score: Weighted composite ──
    const overall = Math.round(
      arrScore * 0.18 +
      valuationScore * 0.22 +
      growthScore * 0.18 +
      sectorMomentum * 0.12 +
      efficiencyScore * 0.15 +
      capitalEfficiency * 0.15
    );

    const { grade, color } = getGrade(overall);

    if (overall >= 80) insights.unshift("Strong investment candidate");
    else if (overall >= 60) insights.unshift("Solid fundamentals with upside potential");
    else if (overall < 35) insights.unshift("Significant risk factors present");

    return {
      overall,
      arrScore,
      valuationScore,
      sectorMomentum,
      efficiencyScore,
      growthScore,
      capitalEfficiency,
      ruleOf40,
      revenueCAGR,
      impliedMultiple,
      forwardMultiple,
      grade,
      color,
      insights: insights.slice(0, 5),
    };
  }, [companyData, allCompanies]);
};
