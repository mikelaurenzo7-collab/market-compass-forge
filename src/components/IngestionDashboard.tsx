import { useState } from "react";
import { motion } from "framer-motion";
import {
  Database, Play, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Clock, ChevronDown, ChevronRight, Loader2, Archive, RotateCcw,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useIngestionRuns,
  usePipelineSchedules,
  useDLQEntries,
  useIngestionStageLogs,
  useTriggerPipeline,
  useRetryDLQ,
  getPipelineFreshness,
} from "@/hooks/useIngestionDashboard";

const PIPELINE_LABELS: Record<string, { label: string; icon: string }> = {
  sec_edgar: { label: "SEC EDGAR", icon: "📊" },
  bankruptcy: { label: "Bankruptcy/Court", icon: "⚖️" },
  cre_records: { label: "CRE Records", icon: "🏢" },
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-success/15 text-success border-success/30",
  running: "bg-primary/15 text-primary border-primary/30",
  pending: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  partial: "bg-warning/15 text-warning border-warning/30",
};

const FRESHNESS_COLORS: Record<string, string> = {
  fresh: "text-success",
  warning: "text-warning",
  stale: "text-destructive",
  unknown: "text-muted-foreground",
};

const IngestionDashboard = () => {
  const { data: runs, isLoading: runsLoading } = useIngestionRuns(30);
  const { data: schedules } = usePipelineSchedules();
  const { data: dlqEntries } = useDLQEntries(20);
  const triggerPipeline = useTriggerPipeline();
  const retryDLQ = useRetryDLQ();
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const handleTrigger = (pipeline: string) => {
    toast.promise(triggerPipeline.mutateAsync({ pipeline }), {
      loading: `Running ${PIPELINE_LABELS[pipeline]?.label ?? pipeline}...`,
      success: (data: any) => `Completed: ${data.published ?? 0} records published`,
      error: (err: any) => `Failed: ${err.message}`,
    });
  };

  const handleRetryDLQ = () => {
    toast.promise(retryDLQ.mutateAsync(undefined), {
      loading: "Retrying failed records...",
      success: (data: any) => `Retried ${data.retried ?? 0}, resolved ${data.resolved ?? 0}`,
      error: (err: any) => `Retry failed: ${err.message}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {["sec_edgar", "bankruptcy", "cre_records"].map((pipeline) => {
          const schedule = schedules?.find(s => s.pipeline === pipeline);
          const freshness = getPipelineFreshness(schedule);
          const latestRun = runs?.find(r => r.pipeline === pipeline);
          const meta = PIPELINE_LABELS[pipeline];

          return (
            <motion.div
              key={pipeline}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta?.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{meta?.label}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      Schedule: {schedule?.cron_expression ?? "Not set"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleTrigger(pipeline)}
                  disabled={triggerPipeline.isPending}
                >
                  {triggerPipeline.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  Run
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Freshness</span>
                  <p className={`font-medium ${FRESHNESS_COLORS[freshness.status]}`}>
                    {freshness.label}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Status</span>
                  <p className="font-medium">
                    {latestRun ? (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${STATUS_COLORS[latestRun.status] ?? STATUS_COLORS.pending}`}>
                        {latestRun.status}
                      </span>
                    ) : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Published</span>
                  <p className="font-mono font-medium text-foreground">
                    {latestRun?.records_published ?? 0}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Failed</span>
                  <p className={`font-mono font-medium ${(latestRun?.records_failed ?? 0) > 0 ? "text-destructive" : "text-foreground"}`}>
                    {latestRun?.records_failed ?? 0}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* DLQ Summary */}
      {(dlqEntries?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold text-destructive">
                Dead Letter Queue ({dlqEntries?.length ?? 0} pending)
              </h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={handleRetryDLQ}
              disabled={retryDLQ.isPending}
            >
              {retryDLQ.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Retry All
            </Button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {dlqEntries?.slice(0, 5).map(entry => (
              <div key={entry.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                <Badge variant="outline" className="text-[10px]">{entry.pipeline}</Badge>
                <span className="text-muted-foreground">{entry.stage}</span>
                <span className="text-destructive truncate flex-1">{entry.error_message}</span>
                <span className="text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Runs */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Recent Ingestion Runs</h3>
          </div>
        </div>

        <div className="divide-y divide-border/50">
          {runsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3"><div className="h-5 bg-muted/40 rounded animate-pulse" /></div>
            ))
          ) : runs?.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">No ingestion runs yet</div>
          ) : (
            runs?.map(run => (
              <RunRow
                key={run.id}
                run={run}
                expanded={expandedRun === run.id}
                onToggle={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const RunRow = ({ run, expanded, onToggle }: { run: any; expanded: boolean; onToggle: () => void }) => {
  const { data: stages } = useIngestionStageLogs(expanded ? run.id : null);
  const meta = PIPELINE_LABELS[run.pipeline];
  const StatusIcon = run.status === "completed" ? CheckCircle : run.status === "failed" ? XCircle : run.status === "running" ? Loader2 : Clock;

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-sm">{meta?.icon}</span>
        <span className="text-sm font-medium text-foreground min-w-[100px]">{meta?.label ?? run.pipeline}</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[run.status] ?? STATUS_COLORS.pending}`}>
          <StatusIcon className={`h-3 w-3 ${run.status === "running" ? "animate-spin" : ""}`} />
          {run.status}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-mono">{run.records_published} published</span>
          {run.records_failed > 0 && (
            <span className="font-mono text-destructive">{run.records_failed} failed</span>
          )}
          <span title={run.started_at ? format(new Date(run.started_at), "PPpp") : ""}>
            {run.started_at ? formatDistanceToNow(new Date(run.started_at), { addSuffix: true }) : "—"}
          </span>
          <Badge variant="outline" className="text-[10px]">{run.triggered_by}</Badge>
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-muted/20 px-4 pb-3"
        >
          {/* Pipeline funnel */}
          <div className="flex items-center gap-1 py-2 overflow-x-auto">
            {[
              { label: "Ingested", value: run.records_ingested },
              { label: "Normalized", value: run.records_normalized },
              { label: "Deduped", value: run.records_deduped },
              { label: "Validated", value: run.records_validated },
              { label: "Published", value: run.records_published },
            ].map((stage, i, arr) => (
              <div key={i} className="flex items-center gap-1">
                <div className="rounded-md border border-border bg-card px-3 py-2 text-center min-w-[80px]">
                  <p className="text-[10px] text-muted-foreground">{stage.label}</p>
                  <p className="text-sm font-mono font-bold text-foreground">{stage.value}</p>
                </div>
                {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>

          {run.error_message && (
            <div className="mt-2 text-xs text-destructive bg-destructive/5 rounded-md p-2 border border-destructive/20">
              {run.error_message}
            </div>
          )}

          {/* Stage logs */}
          {stages && stages.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Stage Logs</p>
              {stages.map((stage: any) => (
                <div key={stage.id} className="flex items-center gap-2 text-xs py-1">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${STATUS_COLORS[stage.status] ?? STATUS_COLORS.pending}`}>
                    {stage.stage}
                  </span>
                  <span className="text-muted-foreground">{stage.records_in}→{stage.records_out}</span>
                  {stage.records_dropped > 0 && (
                    <span className="text-warning text-[10px]">-{stage.records_dropped} dropped</span>
                  )}
                  {stage.error_message && (
                    <span className="text-destructive truncate">{stage.error_message}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default IngestionDashboard;
