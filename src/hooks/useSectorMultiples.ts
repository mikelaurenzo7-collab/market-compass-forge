import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SectorMultiples = {
  evRevenue: { median: number; mean: number; p25: number; p75: number; count: number };
  evEbitda: { median: number; mean: number; p25: number; p75: number; count: number };
  dealCount12m: number;
  fundingCount12m: number;
};

export const useSectorMultiples = (sector: string | null | undefined) =>
  useQuery({
    queryKey: ["sector-multiples", sector],
    queryFn: async (): Promise<SectorMultiples> => {
      // Use the materialized view for pre-computed sector stats
      const { data, error } = await supabase
        .from("mv_sector_multiples")
        .select("*")
        .eq("sector", sector!)
        .maybeSingle();

      if (error || !data) {
        // Fallback: return empty stats
        return {
          evRevenue: { median: 0, mean: 0, p25: 0, p75: 0, count: 0 },
          evEbitda: { median: 0, mean: 0, p25: 0, p75: 0, count: 0 },
          dealCount12m: 0,
          fundingCount12m: 0,
        };
      }

      return {
        evRevenue: {
          median: data.ev_rev_median ?? 0,
          mean: data.ev_rev_mean ?? 0,
          p25: data.ev_rev_p25 ?? 0,
          p75: data.ev_rev_p75 ?? 0,
          count: data.ev_rev_count ?? 0,
        },
        evEbitda: {
          median: data.ev_ebitda_median ?? 0,
          mean: data.ev_ebitda_mean ?? 0,
          p25: data.ev_ebitda_p25 ?? 0,
          p75: data.ev_ebitda_p75 ?? 0,
          count: data.ev_ebitda_count ?? 0,
        },
        dealCount12m: data.deal_count_12m ?? 0,
        fundingCount12m: data.funding_count_12m ?? 0,
      };
    },
    enabled: !!sector,
    staleTime: 10 * 60 * 1000, // 10 minutes — data is pre-computed
  });
