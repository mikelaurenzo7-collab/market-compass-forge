import { useState, useCallback } from "react";
import { Scale, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { formatCurrencyCompact, formatMultiple } from "@/lib/format";
import DCFCalculator from "@/components/DCFCalculator";
import CompTableBuilder from "@/components/CompTableBuilder";
import ValuationFootballField from "@/components/ValuationFootballField";
import type { FootballFieldCompanyData } from "@/components/ValuationFootballField";
import SensitivityPanel from "./SensitivityPanel";
import type { SensitivityInputs } from "./SensitivityPanel";
import MetricItem from "./MetricItem";

import SalesComparison from "./SalesComparison";

interface ValuationTabProps {
  financials: any[];
  fundingRounds: any[];
  companyName?: string;
  companyId?: string;
  dealId?: string;
  dealMode?: string;
}

const ValuationTab = ({ financials, fundingRounds, companyName, companyId, dealId, dealMode }: ValuationTabProps) => {
  const latestFinancial = financials?.[0];
  const initialRevenue = latestFinancial?.revenue ? latestFinancial.revenue / 1e6 : undefined;
  const initialMargin = latestFinancial?.ebitda && latestFinancial?.revenue ? Math.round((latestFinancial.ebitda / latestFinancial.revenue) * 100) : undefined;

  // Sensitivity overrides that drive the football field in real-time
  const [sensitivityOverrides, setSensitivityOverrides] = useState<SensitivityInputs | null>(null);

  const handleSensitivityChange = useCallback((inputs: SensitivityInputs) => {
    setSensitivityOverrides(inputs);
  }, []);

  // Build company data for football field, with sensitivity overrides applied
  const footballFieldData: FootballFieldCompanyData | undefined = latestFinancial ? {
    revenue: latestFinancial.revenue,
    ebitda: latestFinancial.ebitda,
    growthRate: sensitivityOverrides ? sensitivityOverrides.revenueGrowth / 100 : (latestFinancial.revenue && financials?.[1]?.revenue ? (latestFinancial.revenue / financials[1].revenue - 1) : 0.15),
    grossMargin: latestFinancial.gross_margin,
    stage: undefined,
    sector: undefined,
  } : undefined;

  // Override football field ranges when sensitivity is active
  const sensitivityRanges = sensitivityOverrides && latestFinancial ? (() => {
    const rev = (latestFinancial.revenue ?? 0) / 1e6;
    const ebitdaM = latestFinancial.ebitda ? latestFinancial.ebitda / 1e6 : rev * 0.2;
    const { wacc, exitMultiple, revenueGrowth } = sensitivityOverrides;
    const waccDec = wacc / 100;
    const growthDec = revenueGrowth / 100;

    // DCF with sensitivity
    const projectedFCFs = Array.from({ length: 5 }, (_, yr) => {
      const projEbitda = ebitdaM * Math.pow(1 + growthDec, yr + 1);
      return (projEbitda * 0.75) / Math.pow(1 + waccDec, yr + 1);
    });
    const pvFCF = projectedFCFs.reduce((s, v) => s + v, 0);
    const termY5 = ebitdaM * Math.pow(1 + growthDec, 5);
    const tv = (termY5 * exitMultiple) / Math.pow(1 + waccDec, 5);
    const dcfMid = Math.round(pvFCF + tv);

    // Comps with growth-adjusted multiple
    const growthMultiplier = 1 + (revenueGrowth - 15) * 0.05;
    const compMid = Math.round(rev * 5 * Math.max(0.5, growthMultiplier));

    // Precedent txns
    const ptMid = Math.round(compMid * 1.15);

    // LBO
    const exitEV = termY5 * exitMultiple;
    const lboMid = Math.round(exitEV * 0.65);

    return [
      { method: "DCF Analysis", low: Math.round(dcfMid * 0.7), mid: dcfMid, high: Math.round(dcfMid * 1.35), color: "hsl(var(--primary))" },
      { method: "Comp Companies", low: Math.round(compMid * 0.7), mid: compMid, high: Math.round(compMid * 1.4), color: "hsl(var(--chart-1))" },
      { method: "Precedent Txns", low: Math.round(ptMid * 0.75), mid: ptMid, high: Math.round(ptMid * 1.3), color: "hsl(var(--chart-2))" },
      { method: "LBO Analysis", low: Math.round(lboMid * 0.7), mid: lboMid, high: Math.round(lboMid * 1.4), color: "hsl(var(--chart-4))" },
    ];
  })() : undefined;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Sales Comparison (Asset/RE mode) */}
      {dealMode === "asset" && dealId && (
        <SalesComparison dealId={dealId} />
      )}
      {/* Dynamic Sensitivity Panel */}
      <SensitivityPanel
        dealId={dealId}
        companyId={companyId}
        baseRevenue={initialRevenue ?? 100}
        baseEbitdaMargin={initialMargin ?? 25}
        onChange={handleSensitivityChange}
      />

      {/* Football Field — reacts to sliders */}
      <ValuationFootballField
        ranges={sensitivityRanges}
        companyData={!sensitivityRanges ? footballFieldData : undefined}
      />

      {fundingRounds.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Valuation History</h3>
          <div className="space-y-2">
            {fundingRounds.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-xs border-b border-border/30 pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">{r.round_type}</span>
                  {r.date && <span className="text-muted-foreground">{format(new Date(r.date), "MMM yyyy")}</span>}
                </div>
                <div className="flex items-center gap-4">
                    {r.amount && <span className="font-mono tabular-nums text-foreground">{formatCurrencyCompact(r.amount)} raised</span>}
                    {r.valuation_pre && <span className="text-muted-foreground">Pre: {formatCurrencyCompact(r.valuation_pre)}</span>}
                    {r.valuation_post && <span className="text-primary font-mono tabular-nums font-medium">Post: {formatCurrencyCompact(r.valuation_post)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {financials.length > 0 && fundingRounds.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Implied Multiples</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(() => {
              const latestVal = fundingRounds[0]?.valuation_post;
              const latestRev = financials[0]?.revenue;
              const latestEbitda = financials[0]?.ebitda;
              const latestArr = financials[0]?.arr;
              return (
                <>
                  {latestVal && latestRev && <MetricItem label="EV/Revenue" value={formatMultiple(latestVal / latestRev)} />}
                  {latestVal && latestEbitda && latestEbitda > 0 && <MetricItem label="EV/EBITDA" value={formatMultiple(latestVal / latestEbitda)} />}
                  {latestVal && latestArr && <MetricItem label="EV/ARR" value={formatMultiple(latestVal / latestArr)} />}
                  {latestVal && <MetricItem label="Last Valuation" value={formatCurrencyCompact(latestVal)} />}
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" /> DCF Model
        </h3>
        <DCFCalculator initialRevenue={initialRevenue} initialMargin={initialMargin} companyName={companyName} companyId={companyId} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Comparable Analysis
        </h3>
        <CompTableBuilder embedded />
      </div>
    </div>
  );
};

export default ValuationTab;
