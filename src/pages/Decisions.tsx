import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { BookOpen, Filter, Download, ArrowRight, Clock, GitBranch, MessageSquare, CheckCircle, XCircle, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { format } from "date-fns";

interface DecisionEntry {
  id: string;
  deal_id: string;
  decision_type: string;
  from_state: string | null;
  to_state: string | null;
  rationale: string | null;
  metadata: any;
  created_at: string;
  user_id: string;
  deal_pipeline: {
    id: string;
    stage: string;
    companies: { id: string; name: string; sector: string | null } | null;
  } | null;
}

const DECISION_TYPE_LABELS: Record<string, { label: string; icon: typeof GitBranch; color: string }> = {
  stage_change: { label: "Stage Change", icon: GitBranch, color: "text-primary" },
  vote: { label: "IC Vote", icon: CheckCircle, color: "text-success" },
  pass: { label: "Passed", icon: XCircle, color: "text-destructive" },
  note: { label: "Note", icon: MessageSquare, color: "text-muted-foreground" },
  commit: { label: "Committed", icon: CheckCircle, color: "text-success" },
};

const exportToCSV = (decisions: DecisionEntry[]) => {
  const headers = ["Date", "Company", "Decision Type", "From", "To", "Rationale"];
  const rows = decisions.map((d) => [
    format(new Date(d.created_at), "yyyy-MM-dd HH:mm"),
    d.deal_pipeline?.companies?.name ?? "Unknown",
    d.decision_type,
    d.from_state ?? "",
    d.to_state ?? "",
    (d.rationale ?? "").replace(/,/g, ";"),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `decision_journal_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const Decisions = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });

  const { data: decisions, isLoading } = useQuery({
    queryKey: ["decision-journal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_log")
        .select("*, deal_pipeline(id, stage, companies(id, name, sector))")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as unknown) as DecisionEntry[];
    },
  });

  const filtered = useMemo(() => {
    if (!decisions) return [];
    return decisions.filter((d) => {
      if (typeFilter !== "all" && d.decision_type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = d.deal_pipeline?.companies?.name?.toLowerCase() ?? "";
        const rationale = d.rationale?.toLowerCase() ?? "";
        if (!name.includes(q) && !rationale.includes(q)) return false;
      }
      if (dateRange.from && new Date(d.created_at) < new Date(dateRange.from)) return false;
      if (dateRange.to && new Date(d.created_at) > new Date(dateRange.to + "T23:59:59")) return false;
      return true;
    });
  }, [decisions, typeFilter, searchQuery, dateRange]);

  const decisionTypes = useMemo(() => {
    if (!decisions) return [];
    return [...new Set(decisions.map((d) => d.decision_type))];
  }, [decisions]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Decision Journal"
          subtitle="Audit trail of all investment decisions across your deal pipeline."
        />
        {filtered.length > 0 && (
          <button
            onClick={() => exportToCSV(filtered)}
            className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search company or rationale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground"
          >
            <option value="all">All Types</option>
            {decisionTypes.map((t) => (
              <option key={t} value={t}>{DECISION_TYPE_LABELS[t]?.label ?? t}</option>
            ))}
          </select>
        </div>
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground"
          placeholder="From"
        />
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground"
          placeholder="To"
        />
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-border bg-card">
          <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No decisions found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {decisions?.length ? "Try adjusting your filters" : "Stage changes and IC votes will appear here as you work through your deal pipeline"}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((d, i) => {
            const config = DECISION_TYPE_LABELS[d.decision_type] ?? { label: d.decision_type, icon: Clock, color: "text-muted-foreground" };
            const Icon = config.icon;
            const companyName = d.deal_pipeline?.companies?.name ?? "Unknown Deal";
            const sector = d.deal_pipeline?.companies?.sector;

            return (
              <div key={d.id} className="relative flex gap-4 group">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full border-2 border-border bg-card flex items-center justify-center shrink-0 ${config.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {i < filtered.length - 1 && <div className="w-px flex-1 bg-border/50" />}
                </div>

                {/* Content */}
                <div className="pb-6 flex-1 min-w-0">
                  <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            d.decision_type === "pass" ? "border-destructive/30 bg-destructive/10 text-destructive" :
                            d.decision_type === "commit" ? "border-success/30 bg-success/10 text-success" :
                            "border-primary/30 bg-primary/10 text-primary"
                          }`}>
                            {config.label}
                          </span>
                          <button
                            onClick={() => navigate(`/deals/${d.deal_id}`)}
                            className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                          >
                            {companyName}
                          </button>
                          {sector && <span className="text-[10px] text-muted-foreground">{sector}</span>}
                        </div>

                        {(d.from_state || d.to_state) && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                            {d.from_state && <span className="px-1.5 py-0.5 rounded bg-muted font-mono">{d.from_state}</span>}
                            {d.from_state && d.to_state && <ArrowRight className="h-3 w-3" />}
                            {d.to_state && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{d.to_state}</span>}
                          </div>
                        )}

                        {d.rationale && (
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{d.rationale}</p>
                        )}
                      </div>

                      <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap shrink-0">
                        {format(new Date(d.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/50 text-center">
        Showing {filtered.length} of {decisions?.length ?? 0} decisions
      </p>
    </div>
  );
};

export default Decisions;
