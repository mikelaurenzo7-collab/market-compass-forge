import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Portfolio = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type PortfolioPosition = {
  id: string;
  portfolio_id: string;
  company_id: string;
  shares: number;
  entry_price: number;
  entry_date: string;
  notes: string | null;
  created_at: string;
  companies: {
    name: string;
    sector: string | null;
    market_type: string;
  } | null;
  public_market_data: {
    price: number | null;
    price_change_pct: number | null;
    ticker: string;
  }[] | null;
  funding_rounds: {
    valuation_post: number | null;
    round_type: string;
    date: string | null;
  }[] | null;
};

export const usePortfolios = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["portfolios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Portfolio[];
    },
    enabled: !!user,
  });
};

export const usePortfolioPositions = (portfolioId: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["portfolio-positions", portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_positions")
        .select(`
          *,
          companies(name, sector, market_type),
          company_id
        `)
        .eq("portfolio_id", portfolioId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch market data and latest funding for each position
      const companyIds = data.map((p: any) => p.company_id);
      
      const [marketRes, fundingRes] = await Promise.all([
        supabase.from("public_market_data").select("company_id, price, price_change_pct, ticker").in("company_id", companyIds),
        supabase.from("funding_rounds").select("company_id, valuation_post, round_type, date").in("company_id", companyIds).order("date", { ascending: false }),
      ]);

      const marketMap = new Map<string, any>();
      (marketRes.data ?? []).forEach((m: any) => marketMap.set(m.company_id, m));

      const fundingMap = new Map<string, any>();
      (fundingRes.data ?? []).forEach((f: any) => {
        if (!fundingMap.has(f.company_id)) fundingMap.set(f.company_id, f);
      });

      return data.map((p: any) => ({
        ...p,
        public_market_data: marketMap.has(p.company_id) ? [marketMap.get(p.company_id)] : null,
        funding_rounds: fundingMap.has(p.company_id) ? [fundingMap.get(p.company_id)] : null,
      })) as PortfolioPosition[];
    },
    enabled: !!user && !!portfolioId,
  });
};

export const useCreatePortfolio = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("portfolios")
        .insert({ user_id: user!.id, name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolios"] }),
  });
};

export const useAddPosition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pos: { portfolio_id: string; company_id: string; shares: number; entry_price: number; entry_date: string; notes?: string }) => {
      const { error } = await supabase.from("portfolio_positions").insert(pos);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["portfolio-positions", vars.portfolio_id] }),
  });
};

export const useRemovePosition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, portfolioId }: { id: string; portfolioId: string }) => {
      const { error } = await supabase.from("portfolio_positions").delete().eq("id", id);
      if (error) throw error;
      return portfolioId;
    },
    onSuccess: (portfolioId) => qc.invalidateQueries({ queryKey: ["portfolio-positions", portfolioId] }),
  });
};

export const useDeletePortfolio = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolios"] }),
  });
};
