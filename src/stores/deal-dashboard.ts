import { create } from "zustand";
import type { Deal, FinancialDataOpCo, PhysicalAssetPropCo } from "@/types/deal";

interface DealDashboardState {
  /** Currently active deal in the OpCo/PropCo view */
  activeDeal: Deal | null;
  opcoData: FinancialDataOpCo | null;
  propcoData: PhysicalAssetPropCo | null;

  /** Panel sizes as percentages (left = OpCo, right = PropCo) */
  panelSizes: [number, number];

  isLoading: boolean;

  setActiveDeal: (deal: Deal) => void;
  setOpCoData: (data: FinancialDataOpCo) => void;
  setPropCoData: (data: PhysicalAssetPropCo) => void;
  setPanelSizes: (sizes: [number, number]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useDealDashboardStore = create<DealDashboardState>((set) => ({
  activeDeal: null,
  opcoData: null,
  propcoData: null,
  panelSizes: [50, 50],
  isLoading: false,

  setActiveDeal: (deal) => set({ activeDeal: deal }),
  setOpCoData: (data) => set({ opcoData: data }),
  setPropCoData: (data) => set({ propcoData: data }),
  setPanelSizes: (sizes) => set({ panelSizes: sizes }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () =>
    set({
      activeDeal: null,
      opcoData: null,
      propcoData: null,
      panelSizes: [50, 50],
      isLoading: false,
    }),
}));
