import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GlobalOpportunity {
  id: string;
  name: string;
  country: string;
  region: string;
  sector: string | null;
  opportunity_type: string;
  description: string | null;
  deal_value_usd: number | null;
  local_currency: string | null;
  deal_value_local: number | null;
  stage: string | null;
  risk_rating: string | null;
  sovereign_fund_interest: string[] | null;
  key_metrics: Record<string, any> | null;
  source_url: string | null;
  listed_date: string | null;
  status: string | null;
  created_at: string;
}

export const useGlobalOpportunities = () => {
  return useQuery({
    queryKey: ["global-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_opportunities")
        .select("*")
        .order("listed_date", { ascending: false });
      if (error) throw error;
      return data as unknown as GlobalOpportunity[];
    },
    staleTime: 60_000,
  });
};
