import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SearchResult = {
  entity_type: string;
  entity_id: string;
  name: string;
  subtitle: string;
  rank: number;
};

export const useFullTextSearch = (query: string) =>
  useQuery({
    queryKey: ["full-text-search", query],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_all", {
        search_query: query,
        result_limit: 20,
      });
      if (error) throw error;
      return (data ?? []) as SearchResult[];
    },
    enabled: query.length >= 2,
    staleTime: 30_000, // 30s cache
  });
