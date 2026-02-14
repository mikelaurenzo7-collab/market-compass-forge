import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LiveMultipleStats = {
  median: number;
  mean: number;
  p25: number;
  p75: number;
  count: number;
};

export type LiveSectorMultiples = {
  evRevenue: LiveMultipleStats;
  evEbitda: LiveMultipleStats;
  sector: string;
  source: "live" | "materialized";
};

function computePercentiles(arr: number[]): { p25: number; median: number; p75: number; mean: number } {
  if (!arr.length) return { p25: 0, median: 0, p75: 0, mean: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const p = (pct: number) => {
    const idx = (pct / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return {
    p25: p(25),
    median: p(50),
    p75: p(75),
    mean: arr.reduce((s, v) => s + v, 0) / arr.length,
  };
}

export const useLiveSectorMultiples = (sector: string | null | undefined) =>
  useQuery({
    queryKey: ["live-sector-multiples", sector],
    queryFn: async (): Promise<LiveSectorMultiples> => {
      // Get all public companies in this sector with market data
      const { data: companies } = await supabase
        .from("companies")
        .select("id")
        .eq("sector", sector!)
        .eq("market_type", "public")
        .limit(200);

      if (!companies?.length) {
        // Fallback to materialized view
        const { data: mv } = await supabase
          .from("mv_sector_multiples")
          .select("*")
          .eq("sector", sector!)
          .maybeSingle();

        return {
          evRevenue: {
            median: mv?.ev_rev_median ?? 0,
            mean: mv?.ev_rev_mean ?? 0,
            p25: mv?.ev_rev_p25 ?? 0,
            p75: mv?.ev_rev_p75 ?? 0,
            count: mv?.ev_rev_count ?? 0,
          },
          evEbitda: {
            median: mv?.ev_ebitda_median ?? 0,
            mean: mv?.ev_ebitda_mean ?? 0,
            p25: mv?.ev_ebitda_p25 ?? 0,
            p75: mv?.ev_ebitda_p75 ?? 0,
            count: mv?.ev_ebitda_count ?? 0,
          },
          sector: sector!,
          source: "materialized",
        };
      }

      const companyIds = companies.map(c => c.id);
      const { data: marketData } = await supabase
        .from("public_market_data")
        .select("ev_revenue, ev_ebitda")
        .in("company_id", companyIds);

      const evRevVals = (marketData ?? [])
        .map(m => m.ev_revenue)
        .filter((v): v is number => v != null && v > 0 && v < 200);
      const evEbitdaVals = (marketData ?? [])
        .map(m => m.ev_ebitda)
        .filter((v): v is number => v != null && v > 0 && v < 100);

      const revStats = computePercentiles(evRevVals);
      const ebitdaStats = computePercentiles(evEbitdaVals);

      return {
        evRevenue: { ...revStats, count: evRevVals.length },
        evEbitda: { ...ebitdaStats, count: evEbitdaVals.length },
        sector: sector!,
        source: "live",
      };
    },
    enabled: !!sector,
    staleTime: 5 * 60 * 1000,
  });
