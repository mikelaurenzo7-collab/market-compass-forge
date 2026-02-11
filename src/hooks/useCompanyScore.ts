import { useMemo } from "react";
import { useCompaniesWithFinancials } from "@/hooks/useData";
import { useSectorMultiples, SectorMultiples } from "@/hooks/useSectorMultiples";

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
  evEbitda: number | null;
  sectorMedianEvRevenue: number | null;
  sectorMedianEvEbitda: number | null;
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
    ebitda?: number | null;
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
  const { data: sectorMultiples } = useSectorMultiples(companyData?.sector);

  return useMemo(() => {
    if (!companyData || !allCompanies) return null;

    const arr = companyData.arr ?? 0;
    const revenue = companyData.revenue ?? arr;
    const ebitda = companyData.ebitda ?? 0;
    const valuation = companyData.valuation ?? 0;
    const grossMargin = companyData.grossMargin ?? 0;
    const sector = companyData.sector;
    const burnRate = companyData.burnRate ?? 0;
    const runwayMonths = companyData.runwayMonths ?? 0;
    const previousArr = companyData.previousArr ?? 0;
    const historicals = companyData.historicalFinancials ?? [];
    const effectiveArr = arr > 0 ? arr : revenue;
    const insights: string[] = [];

    // ── Computed multiples ──
    let impliedMultiple: number | null = null;
    let evEbitda: number | null = null;
    if (valuation > 0 && effectiveArr > 0) impliedMultiple = valuation / effectiveArr;
    if (valuation > 0 && ebitda > 0) evEbitda = valuation / ebitda;

    // ── Multi-year CAGR ──
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
      const profitMargin = effectiveArr > 0 && burnRate !== 0
        ? (effectiveArr - Math.abs(burnRate) * 12) / effectiveArr
        : grossMargin - 0.3;
      ruleOf40 = (yoyGrowthRate * 100) + (profitMargin * 100);
    }

    // ── Forward multiple ──
    let forwardMultiple: number | null = null;
    const growthForProjection = revenueCAGR ?? (yoyGrowthRate ?? null);
    if (valuation > 0 && effectiveArr > 0 && growthForProjection !== null && growthForProjection > 0) {
      const projectedRevenue2Y = effectiveArr * Math.pow(1 + growthForProjection, 2);
      forwardMultiple = valuation / projectedRevenue2Y;
    }

    // Sector multiples for benchmarking
    const sectorMedianEvRevenue = sectorMultiples?.evRevenue?.median ?? null;
    const sectorMedianEvEbitda = sectorMultiples?.evEbitda?.median ?? null;

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

    // ── 2. Valuation Score (0-100) — now sector-relative ──
    let valuationScore = 50;
    if (valuation > 0 && effectiveArr > 0) {
      const multiple = valuation / effectiveArr;

      // Sector-relative scoring: compare to sector median
      if (sectorMedianEvRevenue && sectorMedianEvRevenue > 0) {
        const relativeMultiple = multiple / sectorMedianEvRevenue;
        // < 0.6x sector median = deep value, > 2x = expensive
        if (relativeMultiple <= 0.5) { valuationScore = 98; insights.push(`Trading at ${Math.round(relativeMultiple * 100)}% of sector median EV/Revenue — deep value`); }
        else if (relativeMultiple <= 0.75) valuationScore = 88;
        else if (relativeMultiple <= 1.0) valuationScore = 74;
        else if (relativeMultiple <= 1.3) valuationScore = 62;
        else if (relativeMultiple <= 1.7) valuationScore = 48;
        else if (relativeMultiple <= 2.5) valuationScore = 32;
        else { valuationScore = 15; insights.push(`Premium at ${relativeMultiple.toFixed(1)}x sector median multiple`); }
      } else {
        // Fallback: absolute thresholds with stage adjustment
        const stageMultiplier =
          companyData.stage?.toLowerCase().includes('series a') ? 1.5 :
          companyData.stage?.toLowerCase().includes('series b') ? 1.3 :
          companyData.stage?.toLowerCase().includes('series c') ? 1.15 :
          companyData.stage?.toLowerCase().includes('growth') ? 0.9 :
          companyData.stage?.toLowerCase().includes('public') ? 0.7 : 1.0;
        let adjustedMultiple = multiple / stageMultiplier;
        if (yoyGrowthRate !== null && yoyGrowthRate > 0) {
          adjustedMultiple = adjustedMultiple / Math.min(2.0, 1 + yoyGrowthRate);
        }
        if (adjustedMultiple <= 5) { valuationScore = 98; insights.push("Deep value at current multiple"); }
        else if (adjustedMultiple <= 10) valuationScore = 88;
        else if (adjustedMultiple <= 18) valuationScore = 74;
        else if (adjustedMultiple <= 30) valuationScore = 58;
        else if (adjustedMultiple <= 50) valuationScore = 42;
        else if (adjustedMultiple <= 80) valuationScore = 28;
        else valuationScore = 15;
      }

      // EV/EBITDA secondary signal: blend in when available
      if (evEbitda !== null && sectorMedianEvEbitda && sectorMedianEvEbitda > 0) {
        const ebitdaRelative = evEbitda / sectorMedianEvEbitda;
        let ebitdaScore = 50;
        if (ebitdaRelative <= 0.5) ebitdaScore = 95;
        else if (ebitdaRelative <= 0.75) ebitdaScore = 82;
        else if (ebitdaRelative <= 1.0) ebitdaScore = 68;
        else if (ebitdaRelative <= 1.5) ebitdaScore = 48;
        else ebitdaScore = 22;
        valuationScore = Math.round(valuationScore * 0.65 + ebitdaScore * 0.35);
      }

      // Forward multiple bonus
      if (forwardMultiple !== null && forwardMultiple < 10) {
        valuationScore = Math.min(100, valuationScore + 8);
        insights.push(`${forwardMultiple.toFixed(1)}x forward multiple — attractive entry`);
      }
    }

    // ── 3. Growth Score (0-100) ──
    let growthScore = 50;
    const growthMetric = revenueCAGR ?? (yoyGrowthRate ?? null);
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

    // ── 4. Sector Momentum (0-100) — now uses real deal activity ──
    let sectorMomentum = 50;
    if (sector) {
      if (sectorMultiples) {
        // Use real data: deal count + funding count + precedent transaction volume
        const dealScore = Math.min(100, (sectorMultiples.dealCount12m / 5) * 100); // 5+ deals = max
        const fundingScore = Math.min(100, (sectorMultiples.fundingCount12m / 10) * 100); // 10+ rounds = max
        const txnDepth = Math.min(100, (sectorMultiples.evRevenue.count / 8) * 100); // 8+ precedents = max

        sectorMomentum = Math.round(dealScore * 0.4 + fundingScore * 0.35 + txnDepth * 0.25);

        if (sectorMomentum >= 70) insights.push(`${sector} — strong deal activity (${sectorMultiples.dealCount12m} deals, ${sectorMultiples.fundingCount12m} rounds in 12m)`);
      } else {
        // Fallback to hot/cold sector heuristic
        const hotSectors = ['AI/ML', 'Cybersecurity', 'Data Infrastructure', 'Developer Tools', 'Defense Tech', 'Cloud Infrastructure'];
        const coolingSectors = ['Crypto/Web3', 'Consumer'];
        if (hotSectors.includes(sector)) { sectorMomentum = 75; insights.push(`${sector} — high sector momentum`); }
        else if (coolingSectors.includes(sector)) sectorMomentum = 30;
        else sectorMomentum = 50;
      }
    }

    // ── 5. Operational Efficiency (0-100) ──
    let efficiencyScore = 50;
    const scores: number[] = [];

    if (grossMargin > 0) {
      const marginScore = grossMargin >= 0.85 ? 95 : grossMargin >= 0.75 ? 80 : grossMargin >= 0.65 ? 65 : grossMargin >= 0.50 ? 45 : grossMargin >= 0.30 ? 25 : 10;
      scores.push(marginScore);
      if (grossMargin >= 0.80) insights.push(`${Math.round(grossMargin * 100)}% gross margin — software-like economics`);
    }

    if (companyData.employee_count && companyData.employee_count > 0 && effectiveArr > 0) {
      const revPerEmp = effectiveArr / companyData.employee_count;
      const empScore = revPerEmp >= 500000 ? 95 : revPerEmp >= 300000 ? 80 : revPerEmp >= 200000 ? 65 : revPerEmp >= 100000 ? 45 : revPerEmp >= 50000 ? 30 : 15;
      scores.push(empScore);
      if (revPerEmp >= 300000) insights.push(`$${Math.round(revPerEmp / 1000)}K rev/employee — capital efficient`);
    }

    if (ruleOf40 !== null) {
      const r40Score = ruleOf40 >= 80 ? 98 : ruleOf40 >= 60 ? 88 : ruleOf40 >= 40 ? 72 : ruleOf40 >= 20 ? 50 : ruleOf40 >= 0 ? 30 : 12;
      scores.push(r40Score);
      if (ruleOf40 >= 40) insights.push(`Rule of 40: ${Math.round(ruleOf40)} — best-in-class`);
      else if (ruleOf40 < 20) insights.push(`Rule of 40: ${Math.round(ruleOf40)} — below threshold`);
    }

    if (scores.length > 0) efficiencyScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // ── 6. Capital Efficiency (0-100) ──
    let capitalEfficiency = 50;
    if (burnRate !== 0 && effectiveArr > 0) {
      const burnMultiple = Math.abs(burnRate) / (effectiveArr / 12);
      if (burnRate > 0) { capitalEfficiency = 98; insights.push("Cash flow positive"); }
      else if (burnMultiple <= 1) { capitalEfficiency = 88; insights.push("Near cash-flow positive"); }
      else if (burnMultiple <= 2) capitalEfficiency = 72;
      else if (burnMultiple <= 3) capitalEfficiency = 55;
      else if (burnMultiple <= 5) capitalEfficiency = 38;
      else { capitalEfficiency = 18; insights.push("High burn relative to revenue"); }
    }
    if (runwayMonths > 0) {
      const runwayScore = runwayMonths >= 36 ? 90 : runwayMonths >= 24 ? 75 : runwayMonths >= 18 ? 55 : runwayMonths >= 12 ? 35 : 15;
      capitalEfficiency = Math.round((capitalEfficiency + runwayScore) / 2);
      if (runwayMonths < 12) insights.push("⚠️ Less than 12 months runway");
    }

    // ── Overall Score ──
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
  }, [companyData, allCompanies, sectorMultiples]);
};
