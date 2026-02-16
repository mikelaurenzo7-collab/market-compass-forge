import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IngestionRun {
  id: string;
  pipeline: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  records_ingested: number;
  records_normalized: number;
  records_deduped: number;
  records_validated: number;
  records_published: number;
  records_failed: number;
  error_message: string | null;
  retry_count: number;
  triggered_by: string;
  created_at: string;
}

export interface PipelineSchedule {
  id: string;
  pipeline: string;
  enabled: boolean;
  cron_expression: string;
  last_run_at: string | null;
  staleness_threshold_hours: number;
}

export interface DLQEntry {
  id: string;
  pipeline: string;
  stage: string;
  source_identifier: string | null;
  error_message: string;
  error_type: string;
  retry_count: number;
  created_at: string;
}

export function useIngestionRuns(limit = 20) {
  return useQuery({
    queryKey: ["ingestion-runs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingestion_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as IngestionRun[];
    },
    staleTime: 30_000,
  });
}

export function usePipelineSchedules() {
  return useQuery({
    queryKey: ["pipeline-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pipeline_schedules").select("*");
      if (error) throw error;
      return (data ?? []) as PipelineSchedule[];
    },
    staleTime: 60_000,
  });
}

export function useDLQEntries(limit = 20) {
  return useQuery({
    queryKey: ["dlq-entries", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dead_letter_queue")
        .select("*")
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as DLQEntry[];
    },
    staleTime: 30_000,
  });
}

export function useIngestionStageLogs(runId: string | null) {
  return useQuery({
    queryKey: ["ingestion-stage-logs", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingestion_stage_logs")
        .select("*")
        .eq("run_id", runId!)
        .order("started_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!runId,
  });
}

export function useTriggerPipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pipeline, options }: { pipeline: string; options?: any }) => {
      const { data, error } = await supabase.functions.invoke("data-pipeline", {
        body: { action: "run", pipeline, options: { ...options, triggeredBy: "manual" } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingestion-runs"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-schedules"] });
    },
  });
}

export function useRetryDLQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pipeline?: string) => {
      const { data, error } = await supabase.functions.invoke("data-pipeline", {
        body: { action: "retry_dlq", pipeline },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dlq-entries"] });
      queryClient.invalidateQueries({ queryKey: ["ingestion-runs"] });
    },
  });
}

/** Compute freshness status for a pipeline */
export function getPipelineFreshness(schedule: PipelineSchedule | undefined) {
  if (!schedule) return { status: "unknown" as const, label: "Unknown" };
  if (!schedule.last_run_at) return { status: "stale" as const, label: "Never run" };

  const hoursSince = (Date.now() - new Date(schedule.last_run_at).getTime()) / 3_600_000;
  if (hoursSince > schedule.staleness_threshold_hours) {
    return { status: "stale" as const, label: `${Math.round(hoursSince)}h ago (stale)` };
  }
  if (hoursSince > schedule.staleness_threshold_hours * 0.75) {
    return { status: "warning" as const, label: `${Math.round(hoursSince)}h ago` };
  }
  return { status: "fresh" as const, label: `${Math.round(hoursSince)}h ago` };
}
