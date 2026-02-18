import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "flat";
  subtitle?: React.ReactNode;
  index?: number;
}

const MetricCard = ({ label, value, change, trend = "flat", subtitle }: MetricCardProps) => {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-2 font-medium">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {change && (
          <div
            className={`flex items-center gap-0.5 text-xs font-mono px-2 py-0.5 rounded-full ${
              trend === "up"
                ? "text-success bg-success/10"
                : trend === "down"
                ? "text-destructive bg-destructive/10"
                : "text-muted-foreground bg-muted/50"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === "down" ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {change}
          </div>
        )}
      </div>
      {subtitle && <p className="text-[11px] text-muted-foreground/70 mt-1.5">{subtitle}</p>}
    </div>
  );
};

export default MetricCard;
