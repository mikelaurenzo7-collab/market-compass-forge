"use client";

import { Droppable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { DealCard } from "./deal-card";
import type { Deal, DealStatus, FinancialDataOpCo } from "@/types/deal";

interface KanbanColumnProps {
  status: DealStatus;
  deals: Deal[];
  opcoDataMap: Record<string, FinancialDataOpCo>;
}

const COLUMN_META: Record<DealStatus, { label: string; color: string }> = {
  Teaser: { label: "Teaser", color: "bg-status-teaser" },
  Diligence: { label: "Diligence", color: "bg-status-diligence" },
  LOI: { label: "LOI", color: "bg-status-loi" },
  Closed: { label: "Closed", color: "bg-status-closed" },
};

export function KanbanColumn({ status, deals, opcoDataMap }: KanbanColumnProps) {
  const meta = COLUMN_META[status];

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30 lg:w-auto lg:flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className={cn("h-2 w-2 rounded-full", meta.color)} />
        <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
        <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {deals.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 space-y-2 overflow-y-auto p-3",
              "min-h-[200px]",
              snapshot.isDraggingOver && "bg-accent/50 ring-1 ring-inset ring-ring/10"
            )}
          >
            {deals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                index={index}
                opcoData={opcoDataMap[deal.id]}
              />
            ))}
            {provided.placeholder}

            {deals.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                Drop deals here
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
