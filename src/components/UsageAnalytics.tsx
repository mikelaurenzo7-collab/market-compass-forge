import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, Activity, FileText, Search, Zap, Download } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

const ACTION_LABELS: Record<string, { label: string; icon: typeof BarChart3; color: string }> = {
  ai_research: { label: "AI Research Queries", icon: Search, color: "text-primary" },
  memo_generation: { label: "Memo Generations", icon: FileText, color: "text-chart-4" },
  enrichment: { label: "Company Enrichments", icon: Zap, color: "text-warning" },
};

const DAILY_LIMITS: Record<string, number> = {
  ai_research: 200,
  memo_generation: 100,
  enrichment: 100,
};

const useUsageAnalytics = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["usage-analytics", user?.id],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30).toISOString();
      const todayStart = startOfDay(now).toISOString();

      // Get all usage in last 30 days
      const { data: usage, error } = await supabase
        .from("usage_tracking")
        .select("action, created_at")
        .eq("user_id", user!.id)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Today's counts
      const todayCounts: Record<string, number> = {};
      const totalCounts: Record<string, number> = {};
      const dailyBreakdown: Record<string, Record<string, number>> = {};

      (usage ?? []).forEach((u: any) => {
        const action = u.action;
        totalCounts[action] = (totalCounts[action] || 0) + 1;

        if (u.created_at >= todayStart) {
          todayCounts[action] = (todayCounts[action] || 0) + 1;
        }

        const day = format(new Date(u.created_at), "yyyy-MM-dd");
        if (!dailyBreakdown[day]) dailyBreakdown[day] = {};
        dailyBreakdown[day][action] = (dailyBreakdown[day][action] || 0) + 1;
      });

      // Build 7-day trend
      const trend: { date: string; total: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(now, i), "yyyy-MM-dd");
        const dayData = dailyBreakdown[d] ?? {};
        const total = Object.values(dayData).reduce((s, v) => s + v, 0);
        trend.push({ date: format(subDays(now, i), "EEE"), total });
      }

      // Pipeline & watchlist counts
      const [pipelineRes, watchlistRes, docsRes] = await Promise.all([
        supabase.from("deal_pipeline").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("user_watchlists").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("document_analyses").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);

      return {
        todayCounts,
        totalCounts,
        trend,
        totalUsage30d: usage?.length ?? 0,
        pipelineDeals: pipelineRes.count ?? 0,
        watchlists: watchlistRes.count ?? 0,
        documents: docsRes.count ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });
};

const UsageBar = ({ action, today, limit }: { action: string; today: number; limit: number }) => {
  const pct = Math.min((today / limit) * 100, 100);
  const config = ACTION_LABELS[action];
  if (!config) return null;
  const Icon = config.icon;
  const isWarning = pct >= 75;
  const isDanger = pct >= 90;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
          <span className="text-xs font-medium text-foreground">{config.label}</span>
        </div>
        <span className={`text-xs font-mono ${isDanger ? "text-destructive" : isWarning ? "text-warning" : "text-muted-foreground"}`}>
          {today} / {limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isDanger ? "bg-destructive" : isWarning ? "bg-warning" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default function UsageAnalytics() {
  const { data: analytics, isLoading } = useUsageAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const maxTrend = Math.max(...(analytics?.trend.map(t => t.total) ?? [1]), 1);

  const exportCSV = () => {
    if (!analytics) return;
    const rows = [
      ["Metric", "Value"],
      ["30-Day Total Actions", String(analytics.totalUsage30d)],
      ["Pipeline Deals", String(analytics.pipelineDeals)],
      ["Watchlists", String(analytics.watchlists)],
      ["Documents Analyzed", String(analytics.documents)],
      ...Object.entries(analytics.totalCounts).map(([k, v]) => [ACTION_LABELS[k]?.label ?? k, String(v)]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Today's Usage */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Today's Usage</h3>
          </div>
          <button
            onClick={exportCSV}
            className="h-7 px-2.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
          >
            <Download className="h-3 w-3" /> Export
          </button>
        </div>
        <div className="space-y-3">
          {Object.entries(DAILY_LIMITS).map(([action, limit]) => (
            <UsageBar
              key={action}
              action={action}
              today={analytics?.todayCounts[action] ?? 0}
              limit={limit}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 7-Day Activity Trend */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">7-Day Activity</h3>
          </div>
          <div className="flex items-end gap-1 h-24">
            {analytics?.trend.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: "72px" }}>
                  <div
                    className="w-full rounded-t bg-primary/60 transition-all min-h-[2px]"
                    style={{ height: `${Math.max((d.total / maxTrend) * 72, 2)}px` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground font-mono">{d.date}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {analytics?.totalUsage30d ?? 0} total actions in last 30 days
          </p>
        </div>

        {/* Account Stats */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Account Stats</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Pipeline Deals", value: analytics?.pipelineDeals ?? 0 },
              { label: "Watchlists", value: analytics?.watchlists ?? 0 },
              { label: "Docs Analyzed", value: analytics?.documents ?? 0 },
              { label: "30d Actions", value: analytics?.totalUsage30d ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-md bg-muted/30 p-3 text-center">
                <p className="text-lg font-bold font-mono text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
