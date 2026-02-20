import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

/**
 * Reusable KPI metric card for financial dashboards.
 * Uses tabular figures for proper numeric alignment.
 */
export function MetricCard({
  label,
  value,
  subtext,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        className
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-tabular text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {subtext && (
        <p
          className={cn(
            "mt-0.5 text-xs",
            trend === "up" && "text-status-loi",
            trend === "down" && "text-destructive",
            (!trend || trend === "neutral") && "text-muted-foreground"
          )}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}
