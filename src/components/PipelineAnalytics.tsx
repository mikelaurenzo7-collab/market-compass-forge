import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { TrendingUp, Clock, Target, ArrowRight, Loader2 } from "lucide-react";

const STAGES = ["sourced", "screening", "due_diligence", "ic_review", "committed", "passed"] as const;
const STAGE_LABELS: Record<string, string> = {
  sourced: "Watching", screening: "Interested", due_diligence: "Diligencing",
  ic_review: "Soft Commit", committed: "Committed", passed: "Passed",
};
const STAGE_COLORS: Record<string, string> = {
  sourced: "hsl(215, 20%, 55%)",
  screening: "hsl(192, 91%, 52%)",
  due_diligence: "hsl(38, 92%, 50%)",
  ic_review: "hsl(280, 65%, 60%)",
  committed: "hsl(142, 60%, 45%)",
  passed: "hsl(0, 72%, 55%)",
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-md border border-border px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono text-foreground">
          {p.name}: <span className="text-primary">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const MetricBox = ({ icon: Icon, label, value, subtitle }: { icon: any; label: string; value: string; subtitle?: string }) => (
  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
      <Icon className="h-3 w-3" />
      {label}
    </div>
    <p className="text-lg font-mono font-semibold text-foreground">{value}</p>
    {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
  </div>
);

const PipelineAnalytics = () => {
  const { user } = useAuth();

  const { data: deals, isLoading } = useQuery({
    queryKey: ["pipeline-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_pipeline")
        .select("id, stage, created_at, updated_at, companies(name, sector)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const analytics = useMemo(() => {
    if (!deals || deals.length === 0) return null;

    // Stage distribution
    const stageCounts = STAGES.map((s) => ({
      stage: STAGE_LABELS[s],
      count: deals.filter((d) => d.stage === s).length,
      color: STAGE_COLORS[s],
    }));

    // Win rate
    const committed = deals.filter((d) => d.stage === "committed").length;
    const passed = deals.filter((d) => d.stage === "passed").length;
    const decided = committed + passed;
    const winRate = decided > 0 ? Math.round((committed / decided) * 100) : 0;

    // Average time in pipeline (days from created to updated)
    const durations = deals.map((d) => {
      const created = new Date(d.created_at).getTime();
      const updated = new Date(d.updated_at).getTime();
      return (updated - created) / (1000 * 60 * 60 * 24);
    });
    const avgDays = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Sector distribution
    const sectorMap = new Map<string, number>();
    deals.forEach((d) => {
      const sector = (d.companies as { sector?: string } | null)?.sector ?? "Unknown";
      sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + 1);
    });
    const sectorData = Array.from(sectorMap.entries())
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Conversion funnel: what % of sourced make it to each stage
    const totalDeals = deals.length;
    const funnel = STAGES.map((s) => {
      const inOrPast = deals.filter((d) => {
        const idx = STAGES.indexOf(d.stage as typeof STAGES[number]);
        const targetIdx = STAGES.indexOf(s);
        return idx >= targetIdx;
      }).length;
      return {
        stage: STAGE_LABELS[s],
        rate: totalDeals > 0 ? Math.round((inOrPast / totalDeals) * 100) : 0,
      };
    });

    return { stageCounts, winRate, avgDays, sectorData, funnel, totalDeals: deals.length, committed, passed };
  }, [deals]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics || analytics.totalDeals === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <TrendingUp className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Add deals to your pipeline to see analytics</p>
      </div>
    );
  }

  const PIE_COLORS = [
    "hsl(192, 91%, 52%)", "hsl(142, 60%, 45%)", "hsl(38, 92%, 50%)",
    "hsl(280, 65%, 60%)", "hsl(0, 72%, 55%)", "hsl(210, 70%, 55%)",
    "hsl(160, 50%, 50%)", "hsl(320, 60%, 55%)",
  ];

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBox icon={Target} label="Total Deals" value={String(analytics.totalDeals)} subtitle="In pipeline" />
        <MetricBox icon={TrendingUp} label="Win Rate" value={`${analytics.winRate}%`} subtitle={`${analytics.committed}W / ${analytics.passed}L`} />
        <MetricBox icon={Clock} label="Avg. Time" value={`${analytics.avgDays}d`} subtitle="In pipeline" />
        <MetricBox icon={ArrowRight} label="Active" value={String(analytics.totalDeals - analytics.committed - analytics.passed)} subtitle="In progress" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stage distribution */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Deals by Stage</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analytics.stageCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
              <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                {analytics.stageCounts.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sector distribution */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Deals by Sector</h4>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={analytics.sectorData}
                dataKey="count"
                nameKey="sector"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ sector, count }) => `${sector} (${count})`}
                labelLine={{ stroke: "hsl(215, 20%, 55%)" }}
              >
                {analytics.sectorData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion funnel */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Conversion Funnel</h4>
        <div className="space-y-2">
          {analytics.funnel.filter((f) => f.stage !== "Passed").map((f, i) => (
            <div key={f.stage} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0">{f.stage}</span>
              <div className="flex-1 h-6 rounded bg-secondary overflow-hidden">
                <div
                  className="h-full rounded bg-primary/80 transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${f.rate}%` }}
                >
                  <span className="text-[10px] font-mono text-primary-foreground font-medium">{f.rate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PipelineAnalytics;
