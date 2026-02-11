import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SectorMultiples = {
  evRevenue: { median: number; mean: number; p25: number; p75: number; count: number };
  evEbitda: { median: number; mean: number; p25: number; p75: number; count: number };
  dealCount12m: number;
  fundingCount12m: number;
};

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
};

const computeStats = (values: number[]) => {
  if (values.length === 0) return { median: 0, mean: 0, p25: 0, p75: 0, count: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    median: percentile(sorted, 50),
    mean,
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75),
    count: sorted.length,
  };
};

export const useSectorMultiples = (sector: string | null | undefined) =>
  useQuery({
    queryKey: ["sector-multiples", sector],
    queryFn: async (): Promise<SectorMultiples> => {
      // Get precedent transactions for this sector
      const { data: txns } = await supabase
        .from("precedent_transactions")
        .select("ev_revenue, ev_ebitda, deal_date")
        .eq("sector", sector!);

      const evRevValues = (txns ?? []).map((t) => t.ev_revenue).filter((v): v is number => v !== null && v > 0);
      const evEbitdaValues = (txns ?? []).map((t) => t.ev_ebitda).filter((v): v is number => v !== null && v > 0);

      // Deal activity in last 12 months
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const cutoff = oneYearAgo.toISOString().split("T")[0];

      const [dealRes, fundingRes] = await Promise.all([
        supabase
          .from("deal_transactions")
          .select("id", { count: "exact", head: true })
          .eq("target_industry", sector!),
        supabase
          .from("funding_rounds")
          .select("id, company_id", { count: "exact" })
          .gte("date", cutoff),
      ]);

      // For funding, we need to cross-reference with companies in this sector
      let fundingCount = 0;
      if (fundingRes.data && fundingRes.data.length > 0) {
        const companyIds = [...new Set(fundingRes.data.map((f) => f.company_id))];
        const { count } = await supabase
          .from("companies")
          .select("id", { count: "exact", head: true })
          .eq("sector", sector!)
          .in("id", companyIds);
        fundingCount = count ?? 0;
      }

      return {
        evRevenue: computeStats(evRevValues),
        evEbitda: computeStats(evEbitdaValues),
        dealCount12m: dealRes.count ?? 0,
        fundingCount12m: fundingCount,
      };
    },
    enabled: !!sector,
  });
