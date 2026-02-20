"use client";

import Link from "next/link";
import { Draggable } from "@hello-pangea/dnd";
import { Calendar, Building2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrencyCompact } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Deal } from "@/types/deal";
import type { FinancialDataOpCo } from "@/types/deal";

interface DealCardProps {
  deal: Deal;
  index: number;
  opcoData?: FinancialDataOpCo | null;
}

function daysInStage(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export function DealCard({ deal, index, opcoData }: DealCardProps) {
  const days = daysInStage(deal.created_at);

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "group rounded-md border border-border bg-card p-3 shadow-sm transition-shadow",
            snapshot.isDragging && "shadow-lg ring-2 ring-ring/20"
          )}
        >
          <Link href={`/deals/${deal.id}`} className="block space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                  {deal.target_company}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {deal.name}
                </p>
              </div>
              <StatusBadge status={deal.status} className="shrink-0" />
            </div>

            {/* Metrics row */}
            {opcoData && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-tabular">
                  <TrendingUp className="h-3 w-3" />
                  {formatCurrencyCompact(opcoData.adjusted_ebitda)} EBITDA
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {deal.target_company.split(" ")[0]}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {days}d in stage
              </span>
            </div>
          </Link>
        </div>
      )}
    </Draggable>
  );
}
