import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency, Financial } from "@/hooks/useData";
import { BarChart3 } from "lucide-react";

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-md border border-border px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono text-foreground">
          {p.name}: <span style={{ color: p.color }}>{formatCurrency(p.value * 1e6)}</span>
        </p>
      ))}
    </div>
  );
};

const FinancialsChart = ({ financials }: { financials: Financial[] }) => {
  if (!financials || financials.length < 2) return null;

  // Sort by period ascending and convert to chart data
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

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Financial History</h3>
        <span className="text-[10px] text-muted-foreground ml-auto font-mono">{chartData.length} periods</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}M`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="line"
          />
          {hasRevenue && (
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(192, 91%, 52%)"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Revenue ($M)"
              connectNulls
            />
          )}
          {hasARR && (
            <Line
              type="monotone"
              dataKey="arr"
              stroke="hsl(142, 60%, 45%)"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="ARR ($M)"
              connectNulls
            />
          )}
          {hasEBITDA && (
            <Line
              type="monotone"
              dataKey="ebitda"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="EBITDA ($M)"
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinancialsChart;
