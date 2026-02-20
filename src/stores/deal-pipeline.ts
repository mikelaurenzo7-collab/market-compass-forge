import { create } from "zustand";
import type { Deal, DealStatus } from "@/types/deal";
import type { DealDragResult } from "@/types/pipeline";
import { PIPELINE_COLUMNS } from "@/types/pipeline";

interface DealPipelineState {
  /** Deals grouped by pipeline column */
  columns: Record<DealStatus, Deal[]>;

  /** Currently loading state */
  isLoading: boolean;

  /** Set the full pipeline state (e.g. from server fetch) */
  setDeals: (deals: Deal[]) => void;

  /** Move a deal between columns after a drag-and-drop event */
  moveDeal: (result: DealDragResult) => void;

  /** Add a new deal to the Teaser column */
  addDeal: (deal: Deal) => void;

  /** Update a deal's data in place */
  updateDeal: (dealId: string, updates: Partial<Deal>) => void;

  setLoading: (loading: boolean) => void;
}

function groupByStatus(deals: Deal[]): Record<DealStatus, Deal[]> {
  const grouped: Record<DealStatus, Deal[]> = {
    Teaser: [],
    Diligence: [],
    LOI: [],
    Closed: [],
  };
  for (const deal of deals) {
    if (grouped[deal.status]) {
      grouped[deal.status].push(deal);
    }
  }
  return grouped;
}

export const useDealPipelineStore = create<DealPipelineState>((set) => ({
  columns: groupByStatus([]),
  isLoading: false,

  setDeals: (deals) =>
    set({ columns: groupByStatus(deals), isLoading: false }),

  moveDeal: (result) =>
    set((state) => {
      const { dealId, sourceColumn, destinationColumn, destinationIndex } =
        result;
      const newColumns = { ...state.columns };

      // Remove from source
      const sourceDeals = [...newColumns[sourceColumn]];
      const dealIndex = sourceDeals.findIndex((d) => d.id === dealId);
      if (dealIndex === -1) return state;

      const [movedDeal] = sourceDeals.splice(dealIndex, 1);
      movedDeal.status = destinationColumn;
      newColumns[sourceColumn] = sourceDeals;

      // Insert into destination
      const destDeals = [...newColumns[destinationColumn]];
      destDeals.splice(destinationIndex, 0, movedDeal);
      newColumns[destinationColumn] = destDeals;

      return { columns: newColumns };
    }),

  addDeal: (deal) =>
    set((state) => ({
      columns: {
        ...state.columns,
        Teaser: [deal, ...state.columns.Teaser],
      },
    })),

  updateDeal: (dealId, updates) =>
    set((state) => {
      const newColumns = { ...state.columns };
      for (const status of PIPELINE_COLUMNS) {
        newColumns[status] = newColumns[status].map((d) =>
          d.id === dealId ? { ...d, ...updates } : d
        );
      }
      return { columns: newColumns };
    }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
