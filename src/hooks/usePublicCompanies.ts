import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type PublicCompany = {
  id: string;
  name: string;
  sector: string | null;
  cik_number: string | null;
  hq_country: string | null;
  employee_count: number | null;
  description: string | null;
  market_data: {
    ticker: string;
    price: number | null;
    market_cap: number | null;
    pe_ratio: number | null;
    eps: number | null;
    price_change_pct: number | null;
    fifty_two_week_high: number | null;
    fifty_two_week_low: number | null;
    volume_avg: number | null;
    beta: number | null;
    exchange: string | null;
    dividend_yield: number | null;
  } | null;
};

export const usePublicCompanies = () =>
  useQuery({
    queryKey: ["public-companies"],
    queryFn: async () => {
      // Get public companies with their market data
      const { data: companies, error } = await supabase
        .from("companies")
        .select("id, name, sector, cik_number, hq_country, employee_count, description")
        .eq("market_type", "public")
        .order("name");
      if (error) throw error;

      if (!companies?.length) return [] as PublicCompany[];

      // Get market data for all public companies
      const companyIds = companies.map((c) => c.id);
      // Batch in groups of 200 to avoid query limits
      const BATCH = 200;
      const marketBatches = [];
      for (let i = 0; i < companyIds.length; i += BATCH) {
        marketBatches.push(
          supabase
            .from("public_market_data")
            .select("company_id, ticker, price, market_cap, pe_ratio, eps, price_change_pct, fifty_two_week_high, fifty_two_week_low, volume_avg, beta, exchange, dividend_yield")
            .in("company_id", companyIds.slice(i, i + BATCH))
        );
      }
      const marketResults = await Promise.all(marketBatches);
      const marketData = marketResults.flatMap((r) => r.data ?? []);

      const marketMap: Record<string, (typeof marketData)[0]> = {};
      marketData.forEach((m) => {
        marketMap[m.company_id] = m;
      });

      return companies.map((c) => ({
        ...c,
        market_data: marketMap[c.id] ?? null,
      })) as PublicCompany[];
    },
  });

export const useSeedPublicCompanies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "seed-public-companies"
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-companies"] });
    },
  });
};
