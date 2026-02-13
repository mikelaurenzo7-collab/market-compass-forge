import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MacroIndicator = {
  id: string;
  series_id: string;
  label: string;
  value: number;
  unit: string;
  observation_date: string;
  fetched_at: string;
};

export const useMacroIndicators = () =>
  useQuery({
    queryKey: ["macro-indicators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("macro_indicators")
        .select("*")
        .order("observation_date", { ascending: false });
      if (error) throw error;

      // Dedupe to latest per series
      const seen = new Set<string>();
      const latest: MacroIndicator[] = [];
      for (const row of data ?? []) {
        if (!seen.has(row.series_id)) {
          seen.add(row.series_id);
          latest.push(row as unknown as MacroIndicator);
        }
      }
      return latest;
    },
    staleTime: 10 * 60 * 1000,
  });
