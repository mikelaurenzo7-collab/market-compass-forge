import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DealIntelligenceResult = {
  deal_id: string;
  company_name: string;
  company_sector: string;
  stage: string;
  thesis: string | null;
  match_source: string;
  match_text: string;
  rank: number;
};

export const useDealIntelligenceSearch = (query: string) =>
  useQuery({
    queryKey: ["deal-intelligence-search", query],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_deals_intelligence", {
        search_query: query,
        result_limit: 10,
      });
      if (error) throw error;
      return (data ?? []) as DealIntelligenceResult[];
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
