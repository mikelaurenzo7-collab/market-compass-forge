import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HybridSearchParams = {
  search?: string;
  sectors?: string[];
  stages?: string[];
  marketType?: string;
  country?: string;
  minRevenue?: number;
  maxRevenue?: number;
  minValuation?: number;
  maxValuation?: number;
  sortBy?: "relevance" | "name" | "valuation" | "revenue";
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type HybridSearchResult = {
  id: string;
  name: string;
  sector: string | null;
  stage: string | null;
  market_type: string | null;
  hq_country: string | null;
  employee_count: number | null;
  domain: string | null;
  founded_year: number | null;
  latest_revenue: number | null;
  latest_arr: number | null;
  latest_ebitda: number | null;
  latest_valuation: number | null;
  latest_round_type: string | null;
  relevance_score: number;
  total_count: number;
};

export const useHybridSearch = (params: HybridSearchParams, enabled = true) =>
  useQuery({
    queryKey: ["hybrid-search", params],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("hybrid_search", {
        search_query: params.search || "",
        filter_sectors: params.sectors?.length ? params.sectors : null,
        filter_stages: params.stages?.length ? params.stages : null,
        filter_market_type: params.marketType || null,
        filter_country: params.country || null,
        min_revenue: params.minRevenue ?? null,
        max_revenue: params.maxRevenue ?? null,
        min_valuation: params.minValuation ?? null,
        max_valuation: params.maxValuation ?? null,
        sort_by: params.sortBy || "relevance",
        sort_direction: params.sortDirection || "desc",
        page_num: params.page ?? 0,
        page_size: params.pageSize ?? 50,
      });
      if (error) throw error;
      return {
        results: (data ?? []) as HybridSearchResult[],
        totalCount: (data as HybridSearchResult[])?.[0]?.total_count ?? 0,
      };
    },
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

// Pre-computed scores from materialized view
export const usePrecomputedScores = () =>
  useQuery({
    queryKey: ["precomputed-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_company_scores")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
