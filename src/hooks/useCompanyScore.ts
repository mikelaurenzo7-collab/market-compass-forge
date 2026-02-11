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

// Percentile rank within a sorted array
const percentileRank = (sortedArr: number[], value: number): number => {
  if (sortedArr.length === 0 || value <= 0) return 0;
  const rank = sortedArr.filter((a) => a <= value).length;
  return (rank / sortedArr.length) * 100;
};

// Sigmoid-like normalization to compress extreme values
const sigmoid = (x: number, midpoint: number, steepness: number = 1): number => {
  return 100 / (1 + Math.exp(-steepness * (x - midpoint)));
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
    const insights: string[] = [];

    // ── 1. ARR/Revenue Scale Score (0-100) ──
    // Percentile rank within the entire dataset, with bonus for $100M+ ARR
    const allARR = allCompanies
      .map((c) => c.latestFinancials?.arr ?? c.latestFinancials?.revenue ?? 0)
      .filter((a) => a > 0)
      .sort((a, b) => a - b);

    let arrScore = 0;
    if (arr > 0 || revenue > 0) {
      const effectiveArr = arr > 0 ? arr : revenue;
      arrScore = Math.round(percentileRank(allARR, effectiveArr));
      // Bonus for scale milestones
      if (effectiveArr >= 1000000000) arrScore = Math.min(100, arrScore + 10);
      else if (effectiveArr >= 100000000) arrScore = Math.min(100, arrScore + 5);
      if (effectiveArr >= 100000000) insights.push("$100M+ ARR milestone achieved");
    }

    // ── 2. Valuation Score (0-100) ──
    // Revenue multiple analysis: lower multiple = better value
    // Adjusted by stage — earlier stage companies warrant higher multiples
    let valuationScore = 50;
    const effectiveRevenue = arr > 0 ? arr : revenue;
    if (valuation > 0 && effectiveRevenue > 0) {
      const multiple = valuation / effectiveRevenue;
      
      // Stage-adjusted scoring: earlier stage = higher acceptable multiple
      const stageMultiplier = 
        companyData.stage?.toLowerCase().includes('series a') ? 1.5 :
        companyData.stage?.toLowerCase().includes('series b') ? 1.3 :
        companyData.stage?.toLowerCase().includes('series c') ? 1.15 :
        companyData.stage?.toLowerCase().includes('growth') ? 0.9 :
        companyData.stage?.toLowerCase().includes('public') ? 0.7 : 1.0;

      const adjustedMultiple = multiple / stageMultiplier;

      // Scoring curve: 5x-80x range, lower is better
      if (adjustedMultiple <= 8) { valuationScore = 95; insights.push("Exceptional value at current multiple"); }
      else if (adjustedMultiple <= 15) valuationScore = 82;
      else if (adjustedMultiple <= 25) valuationScore = 68;
      else if (adjustedMultiple <= 40) valuationScore = 52;
      else if (adjustedMultiple <= 60) valuationScore = 35;
      else if (adjustedMultiple <= 100) valuationScore = 22;
      else { valuationScore = 10; insights.push("Premium valuation relative to revenue"); }
    }

    // ── 3. Growth Score (0-100) ──
    // Year-over-year revenue/ARR growth rate
    let growthScore = 50;
    if (previousArr > 0 && arr > 0) {
      const growthRate = (arr - previousArr) / previousArr;
      // T2D3 benchmark: 3x, 3x, 2x, 2x, 2x
      if (growthRate >= 2.0) { growthScore = 98; insights.push(`${Math.round(growthRate * 100)}% YoY growth — exceptional`); }
      else if (growthRate >= 1.0) growthScore = 88;
      else if (growthRate >= 0.5) growthScore = 72;
      else if (growthRate >= 0.3) growthScore = 58;
      else if (growthRate >= 0.15) growthScore = 42;
      else if (growthRate >= 0) growthScore = 28;
      else { growthScore = 10; insights.push("Revenue declining YoY"); }
    }

    // ── 4. Sector Momentum (0-100) ──
    // Weighted by funding velocity and company density in sector
    let sectorMomentum = 50;
    if (sector) {
      const sectorCompanies = allCompanies.filter((c) => c.sector === sector);
      const sectorCount = sectorCompanies.length;
      const allSectors = Array.from(new Set(allCompanies.map((c) => c.sector).filter(Boolean)));
      const maxSectorCount = Math.max(...allSectors.map((s) => allCompanies.filter((c) => c.sector === s).length));
      
      // Density score
      const densityScore = (sectorCount / maxSectorCount) * 100;
      
      // Hot sector bonus for AI/ML, Cybersecurity
      const hotSectors = ['AI/ML', 'Cybersecurity', 'Data Infrastructure', 'Developer Tools'];
      const hotBonus = hotSectors.includes(sector) ? 15 : 0;
      
      sectorMomentum = Math.min(100, Math.round(densityScore * 0.7 + hotBonus + 20));
      if (hotSectors.includes(sector)) insights.push(`${sector} — high sector momentum`);
    }

    // ── 5. Operational Efficiency (0-100) ──
    // Gross margin + revenue per employee + Rule of 40
    let efficiencyScore = 50;
    const scores: number[] = [];

    // Gross margin component (0-100)
    if (grossMargin > 0) {
      const marginScore = grossMargin >= 0.85 ? 95 :
        grossMargin >= 0.75 ? 80 :
        grossMargin >= 0.65 ? 65 :
        grossMargin >= 0.50 ? 45 :
        grossMargin >= 0.30 ? 25 : 10;
      scores.push(marginScore);
      if (grossMargin >= 0.80) insights.push(`${Math.round(grossMargin * 100)}% gross margin — software-like economics`);
    }

    // Revenue per employee (0-100)
    if (companyData.employee_count && companyData.employee_count > 0 && effectiveRevenue > 0) {
      const revPerEmp = effectiveRevenue / companyData.employee_count;
      // Best-in-class: $400K+/employee
      const empScore = revPerEmp >= 500000 ? 95 :
        revPerEmp >= 300000 ? 80 :
        revPerEmp >= 200000 ? 65 :
        revPerEmp >= 100000 ? 45 :
        revPerEmp >= 50000 ? 30 : 15;
      scores.push(empScore);
      if (revPerEmp >= 300000) insights.push(`$${Math.round(revPerEmp / 1000)}K rev/employee — capital efficient`);
    }

    if (scores.length > 0) {
      efficiencyScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    // ── 6. Capital Efficiency (0-100) ──
    // Runway, burn multiple, and funding efficiency
    let capitalEfficiency = 50;
    if (burnRate !== 0 && effectiveRevenue > 0) {
      const burnMultiple = Math.abs(burnRate) / (effectiveRevenue / 12);
      // Burn multiple < 1 = generating cash, 1-2 = efficient, 2-4 = moderate, 4+ = concerning
      if (burnMultiple <= 0) capitalEfficiency = 95; // cash flow positive
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
      arrScore * 0.20 +
      valuationScore * 0.20 +
      growthScore * 0.15 +
      sectorMomentum * 0.15 +
      efficiencyScore * 0.15 +
      capitalEfficiency * 0.15
    );

    const { grade, color } = getGrade(overall);

    // Add grade insight
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
      grade,
      color,
      insights: insights.slice(0, 4),
    };
  }, [companyData, allCompanies]);
};
