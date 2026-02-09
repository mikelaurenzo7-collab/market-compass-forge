import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "flat";
  subtitle?: string;
}

const MetricCard = ({ label, value, change, trend = "flat", subtitle }: MetricCardProps) => {
  return (
    <div className="gradient-card rounded-lg border border-border p-4 hover:border-glow transition-lift animate-fade-in">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold font-mono tracking-tight text-foreground">{value}</p>
        {change && (
          <div
            className={`flex items-center gap-0.5 text-xs font-mono ${
              trend === "up"
                ? "text-success"
                : trend === "down"
                ? "text-destructive"
                : "text-muted-foreground"
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
      {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
};

export default MetricCard;
