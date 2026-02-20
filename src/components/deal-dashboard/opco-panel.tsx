"use client";

import { RevenueChart } from "./revenue-chart";
import { EbitdaSection } from "./ebitda-section";
import { DebtProfile } from "./debt-profile";
import type { FinancialDataOpCo } from "@/types/deal";

interface OpCoPanelProps {
  opco: FinancialDataOpCo;
  revenueData: { quarter: string; revenue: number }[];
}

export function OpCoPanel({ opco, revenueData }: OpCoPanelProps) {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      {/* Panel label */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-opco" />
        <h2 className="text-sm font-semibold text-foreground">
          OpCo — Operating Company
        </h2>
      </div>

      {/* Revenue chart */}
      <RevenueChart data={revenueData} />

      {/* EBITDA + addbacks */}
      <EbitdaSection
        ttmRevenue={opco.ttm_revenue}
        adjustedEbitda={opco.adjusted_ebitda}
        addbacks={opco.ebitda_addbacks}
      />

      {/* Debt profile */}
      <DebtProfile tranches={opco.debt_profile} />
    </div>
  );
}
