import { BarChart3, TrendingUp, Globe, Trophy, Loader2, Activity, Target, Zap, Users } from "lucide-react";
import MacroImpactMatrix from "@/components/MacroImpactMatrix";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadialBarChart, RadialBar } from "recharts";
import { DealFlowChart, SectorHeatmap } from "@/components/Charts";
import { useValuationByStage, useGeographicDistribution, useTopCompaniesByARR } from "@/hooks/useAnalyticsData";
import { formatCurrency } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { subDays, format, startOfWeek, endOfWeek, startOfDay } from "date-fns";

const COLORS = [
  "hsl(192, 91%, 52%)",
  "hsl(142, 60%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 72%, 55%)",
  "hsl(210, 70%, 55%)",
  "hsl(160, 50%, 50%)",
  "hsl(320, 60%, 55%)",
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-md border border-border px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono text-foreground">
          {p.name}: <span className="text-primary">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

const STAGE_ORDER = ["sourced", "screening", "due_diligence", "ic_review", "committed", "passed"];
const STAGE_LABELS: Record<string, string> = {
  sourced: "Sourced", screening: "Screening", due_diligence: "Due Diligence",
  ic_review: "IC Review", committed: "Committed", passed: "Passed",
};

/* ─── User Activity Stats ─── */
const useUserActivityStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-activity-stats", user?.id],
    queryFn: async () => {
      const now = new Date();
      const weekStart = startOfWeek(now);
      const lastWeekStart = startOfWeek(subDays(weekStart, 1));

      const [usageThisWeek, usageLastWeek, pipelineDeals, watchlists] = await Promise.all([
        supabase.from("usage_tracking").select("action").eq("user_id", user!.id)
          .gte("created_at", weekStart.toISOString()),
        supabase.from("usage_tracking").select("action").eq("user_id", user!.id)
          .gte("created_at", lastWeekStart.toISOString()).lt("created_at", weekStart.toISOString()),
        supabase.from("deal_pipeline").select("id, stage, created_at, updated_at, companies(name, sector)")
          .eq("user_id", user!.id),
        supabase.from("user_watchlists").select("id, company_ids").eq("user_id", user!.id),
      ]);

      const thisWeekScreens = (usageThisWeek.data ?? []).filter(u => u.action === "company_view").length;
      const lastWeekScreens = (usageLastWeek.data ?? []).filter(u => u.action === "company_view").length;
      const screenTrend = lastWeekScreens > 0 ? Math.round(((thisWeekScreens - lastWeekScreens) / lastWeekScreens) * 100) : thisWeekScreens > 0 ? 100 : 0;

      const thisWeekQueries = (usageThisWeek.data ?? []).filter(u => u.action === "ai_query").length;

      // Watchlist → pipeline conversion
      const watchlistCompanyIds = new Set((watchlists.data ?? []).flatMap(w => w.company_ids ?? []));
      const pipelineCompanyIds = new Set((pipelineDeals.data ?? []).map((d: any) => d.companies?.name));
      const watchlistTotal = watchlistCompanyIds.size;
      const converted = watchlistTotal > 0
        ? [...watchlistCompanyIds].filter(id => pipelineCompanyIds.has(id)).length
        : 0;
      const conversionRate = watchlistTotal > 0 ? Math.round((converted / watchlistTotal) * 100) : 0;

      return {
        companiesScreenedThisWeek: thisWeekScreens,
        screenTrend,
        aiQueriesThisWeek: thisWeekQueries,
        watchlistConversion: conversionRate,
        pipelineDeals: pipelineDeals.data ?? [],
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });
};

/* ─── Deal Performance ─── */
const useDealPerformance = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deal-performance", user?.id],
    queryFn: async () => {
      const { data: deals } = await supabase.from("deal_pipeline")
        .select("stage, created_at, updated_at, companies(sector)")
        .eq("user_id", user!.id);

      if (!deals?.length) return { stageTime: [], sectorBreakdown: [], sourcingSpeed: 0 };

      // Average days in each stage (simplified: time since creation for current stage)
      const stageCounts: Record<string, { total: number; count: number }> = {};
      deals.forEach((d: any) => {
        const days = Math.max(1, Math.round((new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)));
        if (!stageCounts[d.stage]) stageCounts[d.stage] = { total: 0, count: 0 };
        stageCounts[d.stage].total += days;
        stageCounts[d.stage].count += 1;
      });

      const stageTime = STAGE_ORDER
        .filter(s => stageCounts[s])
        .map(s => ({
          stage: STAGE_LABELS[s] ?? s,
          avgDays: Math.round(stageCounts[s].total / stageCounts[s].count),
        }));

      // Sector breakdown
      const sectorMap: Record<string, number> = {};
      deals.forEach((d: any) => {
        const sector = (d.companies as any)?.sector ?? "Unknown";
        sectorMap[sector] = (sectorMap[sector] ?? 0) + 1;
      });
      const sectorBreakdown = Object.entries(sectorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({ name, value }));

      // Average sourcing speed (days from creation)
      const allDays = deals.map((d: any) =>
        Math.max(1, Math.round((new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)))
      );
      const sourcingSpeed = Math.round(allDays.reduce((a, b) => a + b, 0) / allDays.length);

      return { stageTime, sectorBreakdown, sourcingSpeed };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
};

/* ─── Stat Card ─── */
const StatCard = ({ icon: Icon, label, value, subtitle, trend }: {
  icon: any; label: string; value: string | number; subtitle?: string; trend?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-lg border border-border bg-card p-4 space-y-2"
  >
    <div className="flex items-center justify-between">
      <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center">
        <Icon className="h-4 w-4 text-accent-foreground" />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-mono font-medium ${trend >= 0 ? "text-primary" : "text-destructive"}`}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
    {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
  </motion.div>
);

const Analytics = () => {
  const { data: valuationData, isLoading: valLoading } = useValuationByStage();
  const { data: geoData, isLoading: geoLoading } = useGeographicDistribution();
  const { data: arrData, isLoading: arrLoading } = useTopCompaniesByARR();
  const { data: userStats } = useUserActivityStats();
  const { data: dealPerf } = useDealPerformance();

  // Simulated peer benchmarks (redacted)
  const peerSourcingSpeed = 14;
  const peerConversion = 12;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics & Insights</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your performance metrics, deal analytics, and market intelligence</p>
      </div>

      {/* User Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Activity}
          label="Companies screened this week"
          value={userStats?.companiesScreenedThisWeek ?? 0}
          trend={userStats?.screenTrend}
          subtitle="vs. last week"
        />
        <StatCard
          icon={Target}
          label="Watchlist → Pipeline"
          value={`${userStats?.watchlistConversion ?? 0}%`}
          subtitle={`Peer avg: ${peerConversion}%`}
        />
        <StatCard
          icon={Zap}
          label="AI queries this week"
          value={userStats?.aiQueriesThisWeek ?? 0}
          subtitle="Research assistant usage"
        />
        <StatCard
          icon={BarChart3}
          label="Avg sourcing speed"
          value={`${dealPerf?.sourcingSpeed ?? "—"} days`}
          subtitle={`Peers: ${peerSourcingSpeed} days`}
        />
      </div>

      {/* Benchmarking bar */}
      {dealPerf?.sourcingSpeed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">You vs. Peer Investors</h3>
            <span className="text-[10px] text-muted-foreground ml-auto">Anonymized benchmark data</span>
          </div>
          <div className="space-y-3">
            {[
              { label: "Sourcing Speed", you: dealPerf.sourcingSpeed, peer: peerSourcingSpeed, unit: "days", lower: true },
              { label: "Watchlist Conversion", you: userStats?.watchlistConversion ?? 0, peer: peerConversion, unit: "%", lower: false },
            ].map((b) => {
              const max = Math.max(b.you, b.peer) * 1.3;
              const youBetter = b.lower ? b.you < b.peer : b.you > b.peer;
              return (
                <div key={b.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{b.label}</span>
                    <span className={`text-xs font-mono font-medium ${youBetter ? "text-primary" : "text-muted-foreground"}`}>
                      {youBetter ? "Above median" : "Below median"}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(b.you / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-foreground w-16 text-right">{b.you} {b.unit}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-muted-foreground/30 rounded-full"
                        style={{ width: `${(b.peer / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-16 text-right">{b.peer} {b.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Deal Performance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Time in Pipeline Stage */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Avg. Days per Pipeline Stage</h3>
          </div>
          {dealPerf?.stageTime?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dealPerf.stageTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="avgDays" fill="hsl(192, 91%, 52%)" radius={[4, 4, 0, 0]} name="Avg Days" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Add deals to your pipeline to see stage analytics.</p>
          )}
        </div>

        {/* Sector Breakdown */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Your Deal Sector Breakdown</h3>
          </div>
          {dealPerf?.sectorBreakdown?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dealPerf.sectorBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={{ stroke: "hsl(215, 20%, 55%)" }}
                >
                  {dealPerf.sectorBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No pipeline deals yet to analyze by sector.</p>
          )}
        </div>
      </div>

      {/* Macro Impact Matrix */}
      <MacroImpactMatrix />

      {/* Market Analytics */}
      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Market Analytics</h2>
      </div>

      {/* Row: Deal Flow + Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DealFlowChart />
        <SectorHeatmap />
      </div>

      {/* Row: Valuation by Stage + Geo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Median Valuation by Stage</h3>
          </div>
          {valLoading ? (
            <div className="flex items-center justify-center h-[200px]"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={valuationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}B`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="median" fill="hsl(192, 91%, 52%)" radius={[4, 4, 0, 0]} name="median ($B)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Geographic Distribution</h3>
          </div>
          {geoLoading ? (
            <div className="flex items-center justify-center h-[200px]"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={geoData} dataKey="count" nameKey="country" cx="50%" cy="50%" outerRadius={80}
                  label={({ country, count }) => `${country} (${count})`} labelLine={{ stroke: "hsl(215, 20%, 55%)" }}>
                  {geoData?.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ARR Leaderboard */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Top Companies by ARR</h3>
        </div>
        {arrLoading ? (
          <div className="flex items-center justify-center h-[100px]"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-data">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">#</th>
                  <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Company</th>
                  <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Sector</th>
                  <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">ARR</th>
                </tr>
              </thead>
              <tbody>
                {arrData?.map((c, i) => (
                  <tr key={c.name} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.sector ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono text-primary font-medium">{formatCurrency(c.arr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
