import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { formatCurrency, Financial } from "@/hooks/useData";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md px-3 py-2.5 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono text-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-semibold" style={{ color: p.color }}>{formatCurrency(p.value * 1e6)}</span>
        </p>
      ))}
    </div>
  );
};

const FinancialsChart = ({ financials }: { financials: Financial[] }) => {
  if (!financials || financials.length < 2) return null;

  const chartData = [...financials]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((f) => ({
      period: f.period,
      revenue: f.revenue ? f.revenue / 1e6 : null,
      arr: f.arr ? f.arr / 1e6 : null,
      ebitda: f.ebitda ? f.ebitda / 1e6 : null,
    }));

  const hasRevenue = chartData.some((d) => d.revenue !== null);
  const hasARR = chartData.some((d) => d.arr !== null);
  const hasEBITDA = chartData.some((d) => d.ebitda !== null);

  // Compute growth rate
  const revValues = chartData.map(d => d.revenue).filter((v): v is number => v !== null);
  const growthPct = revValues.length >= 2
    ? ((revValues[revValues.length - 1] - revValues[0]) / revValues[0]) * 100
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Financial History</h3>
        {growthPct !== null && (
          <div className={`flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${growthPct >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {growthPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(0)}%
          </div>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto font-mono">{chartData.length} periods</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(192, 91%, 52%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(192, 91%, 52%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="arrGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(142, 60%, 45%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(142, 60%, 45%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ebitdaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}M`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
          {hasRevenue && (
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(192, 91%, 52%)"
              strokeWidth={2.5}
              fill="url(#revGrad)"
              dot={{ r: 4, fill: "hsl(192, 91%, 52%)", strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: "hsl(192, 91%, 52%)", strokeWidth: 2, fill: "hsl(var(--card))" }}
              name="Revenue ($M)"
              connectNulls
            />
          )}
          {hasARR && (
            <Area
              type="monotone"
              dataKey="arr"
              stroke="hsl(142, 60%, 45%)"
              strokeWidth={2}
              fill="url(#arrGrad)"
              dot={{ r: 3, fill: "hsl(142, 60%, 45%)", strokeWidth: 0 }}
              name="ARR ($M)"
              connectNulls
            />
          )}
          {hasEBITDA && (
            <Area
              type="monotone"
              dataKey="ebitda"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={2}
              fill="url(#ebitdaGrad)"
              dot={{ r: 3, fill: "hsl(38, 92%, 50%)", strokeWidth: 0 }}
              name="EBITDA ($M)"
              connectNulls
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default FinancialsChart;
