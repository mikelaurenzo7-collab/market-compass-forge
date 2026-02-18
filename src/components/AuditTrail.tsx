import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ArrowRight, Vote, DollarSign, FileText, Filter, Download, Clock, User } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { motion } from "framer-motion";

const ACTION_CONFIG: Record<string, { icon: typeof Shield; label: string; color: string }> = {
  stage_change: { icon: ArrowRight, label: "Stage Change", color: "text-primary" },
  ic_vote: { icon: Vote, label: "IC Vote", color: "text-chart-4" },
  allocation_created: { icon: DollarSign, label: "Allocation Created", color: "text-success" },
  allocation_updated: { icon: DollarSign, label: "Allocation Updated", color: "text-warning" },
  decision_logged: { icon: FileText, label: "Decision Logged", color: "text-muted-foreground" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "stage_change", label: "Stage Changes" },
  { value: "ic_vote", label: "IC Votes" },
  { value: "allocation_created", label: "Allocations" },
  { value: "decision_logged", label: "Decisions" },
];

const AuditTrail = () => {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", filter, page],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filter !== "all") {
        query = query.eq("action", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["audit-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, display_name").limit(500);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((p: any) => { if (p.display_name) map[p.user_id] = p.display_name; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const exportCsv = () => {
    if (!logs?.length) return;
    const headers = ["Timestamp", "User", "Action", "Entity Type", "Entity ID", "Deal ID", "Details"];
    const rows = logs.map((l: any) => [
      format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss"),
      profiles?.[l.user_id] ?? l.user_id ?? "System",
      l.action,
      l.entity_type,
      l.entity_id ?? "",
      l.deal_id ?? "",
      JSON.stringify(l.metadata ?? {}),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grapevine-audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMetadata = (action: string, metadata: any) => {
    if (!metadata) return null;
    switch (action) {
      case "stage_change":
        return (
          <span className="text-[10px] text-muted-foreground">
            <span className="font-mono">{metadata.from_stage}</span>
            <ArrowRight className="inline h-2.5 w-2.5 mx-1" />
            <span className="font-mono font-semibold text-foreground">{metadata.to_stage}</span>
          </span>
        );
      case "ic_vote":
        return (
          <span className="text-[10px]">
            <span className={`font-semibold ${metadata.vote === "yes" ? "text-success" : "text-destructive"}`}>
              {metadata.vote?.toUpperCase()}
            </span>
            {metadata.conviction_score && (
              <span className="text-muted-foreground ml-1.5">Conviction: {metadata.conviction_score}/10</span>
            )}
          </span>
        );
      case "allocation_created":
      case "allocation_updated":
        return (
          <span className="text-[10px] text-muted-foreground">
            <span className="font-mono text-foreground">${Number(metadata.amount ?? 0).toLocaleString()}</span>
            {metadata.allocation_type && <span className="ml-1">({metadata.allocation_type})</span>}
            {metadata.ownership_pct && <span className="ml-1">· {metadata.ownership_pct}%</span>}
          </span>
        );
      case "decision_logged":
        return (
          <span className="text-[10px] text-muted-foreground truncate max-w-[300px] inline-block">
            {metadata.decision_type}{metadata.rationale ? `: ${metadata.rationale}` : ""}
          </span>
        );
      default:
        return <span className="text-[10px] text-muted-foreground font-mono">{JSON.stringify(metadata)}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Audit Trail</h3>
          <span className="text-[9px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">IMMUTABLE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-secondary rounded-md p-0.5">
            <Filter className="h-3 w-3 text-muted-foreground ml-1.5" />
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(0); }}
              className="h-7 text-xs bg-transparent border-none text-foreground focus:outline-none pr-6"
            >
              {FILTER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={exportCsv}
            disabled={!logs?.length}
            className="h-7 px-2.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <Download className="h-3 w-3" /> Export
          </button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground border-l-2 border-primary/30 pl-2">
        This log is append-only and cannot be edited or deleted. Every stage change, IC vote, allocation, and decision is permanently recorded for regulatory compliance.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !logs?.length ? (
        <div className="text-center py-12 text-sm text-muted-foreground">No audit events recorded yet.</div>
      ) : (
        <div className="space-y-0.5">
          {logs.map((log: any, i: number) => {
            const config = ACTION_CONFIG[log.action] ?? { icon: FileText, label: log.action, color: "text-muted-foreground" };
            const Icon = config.icon;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className="flex items-start gap-3 py-2.5 px-3 rounded-md hover:bg-secondary/50 transition-colors border-l-2 border-transparent hover:border-primary/20"
              >
                <div className={`mt-0.5 ${config.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{config.label}</span>
                    {log.deal_id && (
                      <span className="text-[9px] font-mono text-muted-foreground bg-secondary px-1.5 rounded">
                        {log.deal_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  {renderMetadata(log.action, log.metadata)}
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-end">
                    <User className="h-2.5 w-2.5" />
                    {profiles?.[log.user_id] ?? "System"}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {(logs?.length ?? 0) >= PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="h-7 px-3 rounded-md border border-border text-xs text-foreground disabled:opacity-50 hover:bg-secondary"
          >
            Previous
          </button>
          <span className="text-[10px] text-muted-foreground font-mono">Page {page + 1}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            className="h-7 px-3 rounded-md border border-border text-xs text-foreground hover:bg-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;
