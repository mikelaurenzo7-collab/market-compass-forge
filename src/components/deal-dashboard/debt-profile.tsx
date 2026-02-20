"use client";

import { formatCurrency, formatPercent, formatCurrencyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DebtTranche } from "@/types/deal";

interface DebtProfileProps {
  tranches: DebtTranche[];
}

const TYPE_STYLES: Record<string, string> = {
  senior: "bg-status-teaser/10 text-status-teaser border-status-teaser/20",
  mezzanine: "bg-status-diligence/10 text-status-diligence border-status-diligence/20",
  revolver: "bg-muted text-muted-foreground border-border",
  seller_note: "bg-status-loi/10 text-status-loi border-status-loi/20",
};

const TYPE_LABELS: Record<string, string> = {
  senior: "Senior",
  mezzanine: "Mezz",
  revolver: "Revolver",
  seller_note: "Seller Note",
};

export function DebtProfile({ tranches }: DebtProfileProps) {
  const totalDebt = tranches.reduce((sum, t) => sum + t.principal, 0);
  const weightedRate =
    totalDebt > 0
      ? tranches.reduce((sum, t) => sum + t.rate * (t.principal / totalDebt), 0)
      : 0;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h4 className="text-xs font-semibold text-foreground">Debt Profile</h4>
        <div className="flex items-center gap-3">
          <span className="font-tabular text-xs text-muted-foreground">
            Wtd. Rate: {formatPercent(weightedRate, 2)}
          </span>
          <span className="font-tabular text-xs font-medium text-foreground">
            {formatCurrencyCompact(totalDebt)} total
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 text-left">Lender</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-right">Principal</th>
              <th className="px-4 py-2 text-right">Rate</th>
              <th className="px-4 py-2 text-right">Maturity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tranches.map((tranche, i) => (
              <tr key={i} className="hover:bg-muted/50">
                <td className="px-4 py-2.5 text-foreground">{tranche.lender}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                      TYPE_STYLES[tranche.type]
                    )}
                  >
                    {TYPE_LABELS[tranche.type]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-tabular text-foreground">
                  {formatCurrency(tranche.principal)}
                </td>
                <td className="px-4 py-2.5 text-right font-tabular text-foreground">
                  {formatPercent(tranche.rate)}
                </td>
                <td className="px-4 py-2.5 text-right font-tabular text-muted-foreground">
                  {new Date(tranche.maturity_date).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tranches.length === 0 && (
        <p className="px-4 py-4 text-center text-xs text-muted-foreground">
          No debt tranches recorded
        </p>
      )}
    </div>
  );
}
