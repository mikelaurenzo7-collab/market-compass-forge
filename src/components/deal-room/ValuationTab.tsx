import { Scale, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import DCFCalculator from "@/components/DCFCalculator";
import CompTableBuilder from "@/components/CompTableBuilder";
import MetricItem from "./MetricItem";

interface ValuationTabProps {
  financials: any[];
  fundingRounds: any[];
  companyName?: string;
  companyId?: string;
}

const ValuationTab = ({ financials, fundingRounds, companyName, companyId }: ValuationTabProps) => {
  const latestFinancial = financials?.[0];
  const initialRevenue = latestFinancial?.revenue ? latestFinancial.revenue / 1e6 : undefined;
  const initialMargin = latestFinancial?.ebitda && latestFinancial?.revenue ? Math.round((latestFinancial.ebitda / latestFinancial.revenue) * 100) : undefined;

  return (
    <div className="max-w-5xl space-y-6">
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
                  {r.amount && <span className="font-mono text-foreground">${(r.amount / 1e6).toFixed(1)}M raised</span>}
                  {r.valuation_pre && <span className="text-muted-foreground">Pre: ${(r.valuation_pre / 1e6).toFixed(0)}M</span>}
                  {r.valuation_post && <span className="text-primary font-mono font-medium">Post: ${(r.valuation_post / 1e6).toFixed(0)}M</span>}
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
                  {latestVal && latestRev && <MetricItem label="EV/Revenue" value={`${(latestVal / latestRev).toFixed(1)}x`} />}
                  {latestVal && latestEbitda && latestEbitda > 0 && <MetricItem label="EV/EBITDA" value={`${(latestVal / latestEbitda).toFixed(1)}x`} />}
                  {latestVal && latestArr && <MetricItem label="EV/ARR" value={`${(latestVal / latestArr).toFixed(1)}x`} />}
                  {latestVal && <MetricItem label="Last Valuation" value={`$${(latestVal / 1e6).toFixed(0)}M`} />}
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
