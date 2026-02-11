import { useCompanyKPIs, type KPIMetric } from "@/hooks/useCompanyData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatPercent } from "@/hooks/useData";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface KPISparklineProps {
  companyId: string;
}

const METRIC_CONFIG: Record<string, { label: string; format: "currency" | "percent" | "number"; color: string }> = {
  ARR: { label: "ARR", format: "currency", color: "hsl(var(--chart-1))" },
  MRR: { label: "MRR", format: "currency", color: "hsl(var(--chart-2))" },
  Revenue: { label: "Revenue", format: "currency", color: "hsl(var(--chart-3))" },
  "Growth Rate": { label: "Growth", format: "percent", color: "hsl(var(--chart-4))" },
  "Gross Margin": { label: "Gross Margin", format: "percent", color: "hsl(var(--chart-5))" },
  "Burn Rate": { label: "Burn Rate", format: "currency", color: "hsl(var(--destructive))" },
  NRR: { label: "NRR", format: "percent", color: "hsl(var(--chart-1))" },
  CAC: { label: "CAC", format: "currency", color: "hsl(var(--chart-2))" },
  LTV: { label: "LTV", format: "currency", color: "hsl(var(--chart-3))" },
};

function formatValue(value: number, format: "currency" | "percent" | "number"): string {
  if (format === "currency") return formatCurrency(value);
  if (format === "percent") return formatPercent(value);
  return value.toLocaleString();
}

function getTrend(data: KPIMetric[]): "up" | "down" | "flat" {
  if (data.length < 2) return "flat";
  const last = data[data.length - 1].value;
  const prev = data[data.length - 2].value;
  if (last > prev * 1.01) return "up";
  if (last < prev * 0.99) return "down";
  return "flat";
}

function MetricCard({ metricName, data }: { metricName: string; data: KPIMetric[] }) {
  const config = METRIC_CONFIG[metricName] || { label: metricName, format: "number", color: "hsl(var(--primary))" };
  const latestValue = data[data.length - 1]?.value ?? 0;
  const trend = getTrend(data);
  const chartData = data.map((d) => ({ value: d.value }));
  const latestConfidence = data[data.length - 1]?.confidence_score;
  const latestSource = data[data.length - 1]?.definition_source;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{config.label}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Source: {latestSource || "Unknown"}</p>
                  <p className="text-xs">Confidence: {latestConfidence || "N/A"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {latestConfidence && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {latestConfidence}
            </Badge>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-foreground">{formatValue(latestValue, config.format)}</span>
            {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
            {trend === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
            {trend === "flat" && <Minus className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {chartData.length > 1 && (
          <div className="h-12 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-1">
          {data[0]?.period} — {data[data.length - 1]?.period}
        </p>
      </CardContent>
    </Card>
  );
}

export default function KPISparklines({ companyId }: KPISparklineProps) {
  const { data: kpis, isLoading } = useCompanyKPIs(companyId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!kpis?.length) {
    return (
      <Card className="bg-card/50">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          No KPI data available
        </CardContent>
      </Card>
    );
  }

  // Group by metric name
  const grouped: Record<string, KPIMetric[]> = {};
  kpis.forEach((k) => {
    if (!grouped[k.metric_name]) grouped[k.metric_name] = [];
    grouped[k.metric_name].push(k);
  });

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">KPI Trends</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(grouped).map(([metricName, data]) => (
          <MetricCard key={metricName} metricName={metricName} data={data} />
        ))}
      </div>
    </div>
  );
}
