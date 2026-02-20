"use client";

import Link from "next/link";
import { ArrowLeft, Upload, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrencyCompact } from "@/lib/format";
import type { Deal, FinancialDataOpCo } from "@/types/deal";

interface DealHeaderProps {
  deal: Deal;
  opco: FinancialDataOpCo | null;
}

export function DealHeader({ deal, opco }: DealHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
      <div className="flex items-center gap-4">
        <Link
          href="/command-center"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-foreground">
              {deal.target_company}
            </h1>
            <StatusBadge status={deal.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {deal.name}
            {opco && (
              <span className="ml-2 font-tabular">
                &middot; EBITDA {formatCurrencyCompact(opco.adjusted_ebitda)}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/deals/${deal.id}/upload`}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Docs
        </Link>
        <button className="inline-flex h-8 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent">
          <ExternalLink className="h-3.5 w-3.5" />
          Export
        </button>
      </div>
    </header>
  );
}
