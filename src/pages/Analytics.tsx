import { BarChart3, TrendingUp, Globe, Trophy, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DealFlowChart, SectorHeatmap } from "@/components/Charts";
import { useValuationByStage, useGeographicDistribution, useTopCompaniesByARR } from "@/hooks/useAnalyticsData";
import { formatCurrency } from "@/hooks/useData";

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

const Analytics = () => {
  const { data: valuationData, isLoading: valLoading } = useValuationByStage();
  const { data: geoData, isLoading: geoLoading } = useGeographicDistribution();
  const { data: arrData, isLoading: arrLoading } = useTopCompaniesByARR();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Market analytics, sector insights & deal intelligence</p>
      </div>

      {/* Row 1: Deal Flow + Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DealFlowChart />
        <SectorHeatmap />
      </div>

      {/* Row 2: Valuation by Stage + Geo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Valuation by Stage */}
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

        {/* Geographic Distribution */}
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
                <Pie
                  data={geoData}
                  dataKey="count"
                  nameKey="country"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ country, count }) => `${country} (${count})`}
                  labelLine={{ stroke: "hsl(215, 20%, 55%)" }}
                >
                  {geoData?.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3: ARR Leaderboard */}
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
