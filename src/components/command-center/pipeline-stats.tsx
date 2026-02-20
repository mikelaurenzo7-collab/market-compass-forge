"use client";

import { useDealPipelineStore } from "@/stores/deal-pipeline";
import { MOCK_OPCO_DATA } from "@/lib/mock-data";
import { formatCurrencyCompact } from "@/lib/format";
import { MetricCard } from "@/components/shared/metric-card";

export function PipelineStats() {
  const columns = useDealPipelineStore((s) => s.columns);

  const totalDeals =
    columns.Teaser.length +
    columns.Diligence.length +
    columns.LOI.length +
    columns.Closed.length;

  const activeDeals = totalDeals - columns.Closed.length;

  // Sum EBITDA across all active deals
  const totalEbitda = [...columns.Teaser, ...columns.Diligence, ...columns.LOI]
    .reduce((sum, deal) => {
      const opco = MOCK_OPCO_DATA[deal.id];
      return sum + (opco?.adjusted_ebitda ?? 0);
    }, 0);

  // Sum total debt across all deals
  const totalDebt = Object.values(MOCK_OPCO_DATA).reduce((sum, opco) => {
    return sum + opco.debt_profile.reduce((s, t) => s + t.principal, 0);
  }, 0);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Total Pipeline"
        value={String(totalDeals)}
        subtext={`${activeDeals} active`}
      />
      <MetricCard
        label="Active EBITDA"
        value={formatCurrencyCompact(totalEbitda)}
        subtext="Across active deals"
        trend="up"
      />
      <MetricCard
        label="In Diligence"
        value={String(columns.Diligence.length)}
        subtext="Deals under review"
      />
      <MetricCard
        label="Total Debt Exposure"
        value={formatCurrencyCompact(totalDebt)}
        subtext="All tranches"
      />
    </div>
  );
}
