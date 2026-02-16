import { useMemo } from "react";
import { useCompaniesWithFinancials } from "@/hooks/useData";
import { useSectorMultiples } from "@/hooks/useSectorMultiples";
import {
  computeValuationScore,
  CompanyInputs,
  SectorBenchmarks,
  ScoreResult,
} from "@/lib/valuationEngine";

// Re-export for backward compatibility
export type CompanyScoreResult = ScoreResult;

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

    // Build inputs for the canonical engine
    const inputs: CompanyInputs = {
      sector: companyData.sector,
      stage: companyData.stage,
      employeeCount: companyData.employee_count,
      arr: companyData.arr ?? 0,
      revenue: companyData.revenue ?? (companyData.arr ?? 0),
      ebitda: companyData.ebitda ?? 0,
      valuation: companyData.valuation ?? 0,
      grossMargin: companyData.grossMargin ?? 0,
      burnRate: companyData.burnRate ?? 0,
      runwayMonths: companyData.runwayMonths ?? 0,
      previousArr: companyData.previousArr ?? 0,
      historicals: (companyData.historicalFinancials ?? []).map((h) => ({
        period: h.period,
        arr: h.arr,
        revenue: h.revenue,
      })),
    };

    // Build peer ARR distribution
    const peerArr = allCompanies
      .map((c) => c.latestFinancials?.arr ?? c.latestFinancials?.revenue ?? 0)
      .filter((a) => a > 0)
      .sort((a, b) => a - b);

    // Build sector benchmarks
    const benchmarks: SectorBenchmarks | null = sectorMultiples
      ? {
          evRevenueMedian: sectorMultiples.evRevenue.median,
          evEbitdaMedian: sectorMultiples.evEbitda.median,
          dealCount12m: sectorMultiples.dealCount12m,
          fundingCount12m: sectorMultiples.fundingCount12m,
          evRevenueCount: sectorMultiples.evRevenue.count,
        }
      : null;

    return computeValuationScore(inputs, peerArr, benchmarks);
  }, [companyData, allCompanies, sectorMultiples]);
};
