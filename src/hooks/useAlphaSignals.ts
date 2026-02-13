import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type AlphaSignal = {
  id: string;
  sector: string;
  signal_type: string;
  direction: "bullish" | "bearish" | "neutral";
  magnitude_pct: number;
  confidence: "low" | "medium" | "high";
  reasoning: string;
  macro_context: Record<string, any>;
  generated_at: string;
  model_used: string;
};

export const useAlphaSignals = () =>
  useQuery({
    queryKey: ["alpha-signals"],
    queryFn: async () => {
      // Get latest signal per sector
      const { data, error } = await supabase
        .from("alpha_signals")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      // Dedupe to latest per sector
      const seen = new Set<string>();
      const latest: AlphaSignal[] = [];
      for (const row of data ?? []) {
        if (!seen.has(row.sector)) {
          seen.add(row.sector);
          latest.push(row as unknown as AlphaSignal);
        }
      }
      return latest;
    },
    staleTime: 5 * 60 * 1000,
  });

export const useGenerateAlphaSignals = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("alpha-signals", {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alpha-signals"] });
      queryClient.invalidateQueries({ queryKey: ["data-sources-stats"] });
      toast({
        title: "Alpha Signals Generated",
        description: data?.message || "New sector predictions are ready",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Signal Generation Failed",
        description: err.message || "Check logs for details",
        variant: "destructive",
      });
    },
  });
};
