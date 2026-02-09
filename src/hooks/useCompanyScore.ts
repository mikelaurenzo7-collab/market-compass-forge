import { useMemo } from "react";
import { useCompaniesWithFinancials } from "@/hooks/useData";

export type CompanyScoreResult = {
  overall: number;
  arrScore: number;
  valuationScore: number;
  sectorMomentum: number;
  efficiencyScore: number;
  grade: string;
  color: string;
};

const GRADE_MAP: { min: number; grade: string; color: string }[] = [
  { min: 85, grade: "A+", color: "text-success" },
  { min: 75, grade: "A", color: "text-success" },
  { min: 65, grade: "B+", color: "text-chart-2" },
  { min: 55, grade: "B", color: "text-primary" },
  { min: 45, grade: "C+", color: "text-warning" },
  { min: 35, grade: "C", color: "text-warning" },
  { min: 0, grade: "D", color: "text-destructive" },
];

const getGrade = (score: number) => {
  const g = GRADE_MAP.find((g) => score >= g.min) ?? GRADE_MAP[GRADE_MAP.length - 1];
  return { grade: g.grade, color: g.color };
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
  }
): CompanyScoreResult | null => {
  const { data: allCompanies } = useCompaniesWithFinancials();

  return useMemo(() => {
    if (!companyData || !allCompanies) return null;

    const arr = companyData.arr ?? 0;
    const valuation = companyData.valuation ?? 0;
    const grossMargin = companyData.grossMargin ?? 0;
    const sector = companyData.sector;

    // 1. ARR Score (0-100): Rank within dataset
    const allARR = allCompanies
      .map((c) => c.latestFinancials?.arr ?? 0)
      .filter((a) => a > 0)
      .sort((a, b) => a - b);
    
    let arrScore = 50;
    if (arr > 0 && allARR.length > 0) {
      const rank = allARR.filter((a) => a <= arr).length;
      arrScore = Math.round((rank / allARR.length) * 100);
    }

    // 2. Valuation Score (0-100): Revenue/ARR multiple efficiency
    // Lower multiple = better value = higher score for investors
    let valuationScore = 50;
    if (valuation > 0 && arr > 0) {
      const multiple = valuation / arr;
      // Typical range: 5x-100x. Lower is better for value investors
      if (multiple <= 10) valuationScore = 90;
      else if (multiple <= 20) valuationScore = 75;
      else if (multiple <= 40) valuationScore = 60;
      else if (multiple <= 60) valuationScore = 45;
      else if (multiple <= 80) valuationScore = 30;
      else valuationScore = 20;
    }

    // 3. Sector Momentum (0-100): How many companies in same sector
    let sectorMomentum = 50;
    if (sector) {
      const sectorCount = allCompanies.filter((c) => c.sector === sector).length;
      const maxSectorCount = Math.max(
        ...Array.from(
          new Set(allCompanies.map((c) => c.sector).filter(Boolean))
        ).map((s) => allCompanies.filter((c) => c.sector === s).length)
      );
      sectorMomentum = Math.round((sectorCount / maxSectorCount) * 100);
    }

    // 4. Efficiency Score (0-100): Gross margin + revenue per employee
    let efficiencyScore = 50;
    if (grossMargin > 0) {
      efficiencyScore = Math.min(100, Math.round(grossMargin * 120));
    }
    if (companyData.employee_count && arr > 0) {
      const revPerEmp = arr / companyData.employee_count;
      // $100K-$500K per employee is typical
      const empScore = Math.min(100, Math.round((revPerEmp / 300000) * 100));
      efficiencyScore = Math.round((efficiencyScore + empScore) / 2);
    }

    // Overall: Weighted average
    const overall = Math.round(
      arrScore * 0.30 +
      valuationScore * 0.25 +
      sectorMomentum * 0.20 +
      efficiencyScore * 0.25
    );

    const { grade, color } = getGrade(overall);

    return {
      overall,
      arrScore,
      valuationScore,
      sectorMomentum,
      efficiencyScore,
      grade,
      color,
    };
  }, [companyData, allCompanies]);
};
