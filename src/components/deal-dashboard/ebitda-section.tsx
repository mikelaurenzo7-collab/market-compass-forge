"use client";

import { formatCurrency, formatCurrencyCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EbitdaAddback } from "@/types/deal";

interface EbitdaSectionProps {
  ttmRevenue: number;
  adjustedEbitda: number;
  addbacks: EbitdaAddback[];
}

const CATEGORY_LABELS: Record<string, string> = {
  one_time: "One-time",
  non_recurring: "Non-recurring",
  owner_related: "Owner-related",
  pro_forma: "Pro Forma",
};

const CATEGORY_COLORS: Record<string, string> = {
  one_time: "text-status-diligence",
  non_recurring: "text-muted-foreground",
  owner_related: "text-status-teaser",
  pro_forma: "text-status-loi",
};

export function EbitdaSection({ ttmRevenue, adjustedEbitda, addbacks }: EbitdaSectionProps) {
  const margin = ttmRevenue > 0 ? (adjustedEbitda / ttmRevenue) * 100 : 0;
  const totalAddbacks = addbacks.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="space-y-4">
      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            TTM Revenue
          </p>
          <p className="mt-1 font-tabular text-lg font-semibold text-foreground">
            {formatCurrencyCompact(ttmRevenue)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Adj. EBITDA
          </p>
          <p className="mt-1 font-tabular text-lg font-semibold text-foreground">
            {formatCurrencyCompact(adjustedEbitda)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            EBITDA Margin
          </p>
          <p className="mt-1 font-tabular text-lg font-semibold text-foreground">
            {formatPercent(margin, 1)}
          </p>
        </div>
      </div>

      {/* Addbacks table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <h4 className="text-xs font-semibold text-foreground">EBITDA Addbacks</h4>
          <span className="font-tabular text-xs font-medium text-foreground">
            {formatCurrencyCompact(totalAddbacks)} total
          </span>
        </div>
        <div className="divide-y divide-border">
          {addbacks.map((addback, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{addback.label}</p>
                <p className={cn("text-[11px] font-medium", CATEGORY_COLORS[addback.category])}>
                  {CATEGORY_LABELS[addback.category]}
                </p>
              </div>
              <span className="ml-4 shrink-0 font-tabular text-sm font-medium text-foreground">
                {formatCurrency(addback.amount)}
              </span>
            </div>
          ))}
          {addbacks.length === 0 && (
            <p className="px-4 py-4 text-center text-xs text-muted-foreground">
              No addbacks recorded
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
