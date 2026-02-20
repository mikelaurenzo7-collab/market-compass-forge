"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface RevenueChartProps {
  data: { quarter: string; revenue: number }[];
}

function formatAxis(value: number): string {
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value}`;
}

function formatTooltip(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Quarterly Revenue
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatAxis}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              formatter={(value: number) => [formatTooltip(value), "Revenue"]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            />
            <Bar
              dataKey="revenue"
              fill="hsl(var(--opco))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
