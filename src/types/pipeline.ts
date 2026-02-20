import type { Deal, DealStatus } from "./deal";

/** Column definition for the Kanban pipeline board */
export interface KanbanColumn {
  id: DealStatus;
  title: string;
  deals: Deal[];
}

/** Payload emitted when a deal card is dragged between columns */
export interface DealDragResult {
  dealId: string;
  sourceColumn: DealStatus;
  destinationColumn: DealStatus;
  sourceIndex: number;
  destinationIndex: number;
}

/** Default column order for the Command Center Kanban */
export const PIPELINE_COLUMNS: readonly DealStatus[] = [
  "Teaser",
  "Diligence",
  "LOI",
  "Closed",
] as const;
