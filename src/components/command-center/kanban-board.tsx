"use client";

import { useEffect } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { useDealPipelineStore } from "@/stores/deal-pipeline";
import { MOCK_DEALS, MOCK_OPCO_DATA } from "@/lib/mock-data";
import { PIPELINE_COLUMNS } from "@/types/pipeline";
import { KanbanColumn } from "./kanban-column";
import type { DealStatus } from "@/types/deal";

export function KanbanBoard() {
  const { columns, setDeals, moveDeal, isLoading, setLoading } =
    useDealPipelineStore();

  // Initialize with mock data on mount
  useEffect(() => {
    setLoading(true);
    // In production, call getPipelineDeals() Server Action here
    setDeals(MOCK_DEALS);
  }, [setDeals, setLoading]);

  function handleDragEnd(result: DropResult) {
    const { draggableId, source, destination } = result;

    // Dropped outside a column
    if (!destination) return;

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColumn = source.droppableId as DealStatus;
    const destinationColumn = destination.droppableId as DealStatus;

    // Optimistic update in Zustand
    moveDeal({
      dealId: draggableId,
      sourceColumn,
      destinationColumn,
      sourceIndex: source.index,
      destinationIndex: destination.index,
    });

    // In production, persist via Server Action:
    // moveDeal(draggableId, destinationColumn)

    if (sourceColumn !== destinationColumn) {
      toast.success(`Moved to ${destinationColumn}`, {
        description: `Deal advanced from ${sourceColumn}`,
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-x-visible">
        {PIPELINE_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            deals={columns[status]}
            opcoDataMap={MOCK_OPCO_DATA}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
