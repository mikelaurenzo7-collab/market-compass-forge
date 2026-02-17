import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DCFAutoData = {
  revenue: number | null; // in $M
  revenueGrowth: number | null; // as percentage
  ebitdaMargin: number | null; // as percentage
  beta: number | null;
  companyName: string;
  sector: string | null;
  marketType: string;
  source: string;
};

export const useDCFAutoPopulate = (companyId: string | null) =>
  useQuery({
    queryKey: ["dcf-auto-populate", companyId],
    queryFn: async (): Promise<DCFAutoData> => {
      const [companyRes, financialsRes, marketRes] = await Promise.all([
        supabase.from("companies").select("name, sector, market_type").eq("id", companyId!).single(),
        supabase
          .from("financials")
          .select("revenue, ebitda, arr, period")
          .eq("company_id", companyId!)
          .order("period", { ascending: false })
          .limit(5),
        supabase
          .from("funding_rounds")
          .select("amount, valuation_post, round_type, date")
          .eq("company_id", companyId!)
          .order("date", { ascending: false })
          .limit(1),
      ]);

      const company = companyRes.data;
      const financials = financialsRes.data ?? [];
      const latestRound = (marketRes.data ?? [])[0];

      // Calculate revenue: prefer SEC/FMP data, fallback to financials table
      let revenue: number | null = null;
      let ebitdaMargin: number | null = null;
      let revenueGrowth: number | null = null;
      let source = "manual";

      if (financials.length > 0) {
        const latest = financials[0];
        if (latest.revenue && latest.revenue > 0) {
          revenue = latest.revenue / 1e6;
          source = "SEC/DB";
          if (latest.ebitda && latest.ebitda > 0) {
            ebitdaMargin = (latest.ebitda / latest.revenue) * 100;
          }
        } else if (latest.arr && latest.arr > 0) {
          revenue = latest.arr / 1e6;
          source = "ARR estimate";
        }
      }

      // Revenue growth from historical financials
      if (financials.length >= 2) {
        const revValues = financials
          .map(f => f.revenue ?? f.arr)
          .filter((v): v is number => v != null && v > 0);
        if (revValues.length >= 2) {
          const latest = revValues[0];
          const oldest = revValues[revValues.length - 1];
          const years = revValues.length - 1;
          if (oldest > 0 && years > 0) {
            revenueGrowth = (Math.pow(latest / oldest, 1 / years) - 1) * 100;
          }
        }
      }

      return {
        revenue,
        revenueGrowth: revenueGrowth !== null ? Math.round(revenueGrowth * 10) / 10 : null,
        ebitdaMargin: ebitdaMargin !== null ? Math.round(ebitdaMargin * 10) / 10 : null,
        beta: null,
        companyName: company?.name ?? "Unknown",
        sector: company?.sector ?? null,
        marketType: company?.market_type ?? "private",
        source,
      };
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  });
