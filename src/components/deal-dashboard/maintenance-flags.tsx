"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrencyCompact } from "@/lib/format";
import type { DeferredMaintenanceFlag } from "@/types/deal";

interface MaintenanceFlagsProps {
  flags: DeferredMaintenanceFlag[];
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
  high: { bg: "bg-status-diligence/10", text: "text-status-diligence", border: "border-status-diligence/20" },
  medium: { bg: "bg-status-teaser/10", text: "text-status-teaser", border: "border-status-teaser/20" },
  low: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
};

export function MaintenanceFlags({ flags }: MaintenanceFlagsProps) {
  const totalCost = flags.reduce((sum, f) => sum + f.estimated_cost, 0);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h4 className="text-xs font-semibold text-foreground">
          Deferred Maintenance
        </h4>
        {totalCost > 0 && (
          <span className="font-tabular text-xs font-medium text-status-diligence">
            {formatCurrencyCompact(totalCost)} est. cost
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        {flags.map((flag, i) => {
          const styles = SEVERITY_STYLES[flag.severity];
          return (
            <div
              key={i}
              className={cn(
                "rounded-md border p-3",
                styles.bg,
                styles.border
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn("h-3.5 w-3.5", styles.text)} />
                  <span className="text-sm font-medium text-foreground">
                    {flag.system}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-medium capitalize",
                      styles.text
                    )}
                  >
                    {flag.severity}
                  </span>
                  <span className="font-tabular text-xs font-medium text-foreground">
                    {formatCurrencyCompact(flag.estimated_cost)}
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {flag.description}
              </p>
            </div>
          );
        })}
        {flags.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No deferred maintenance flags
          </p>
        )}
      </div>
    </div>
  );
}
