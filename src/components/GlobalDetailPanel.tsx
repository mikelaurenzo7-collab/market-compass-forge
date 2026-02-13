import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Globe, DollarSign, ShieldAlert, TrendingUp, ExternalLink, Users } from "lucide-react";
import type { GlobalOpportunity } from "@/hooks/useGlobalOpportunities";

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-500/10 text-green-500 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  very_high: "bg-destructive/10 text-destructive border-destructive/20",
};

const TYPE_LABELS: Record<string, string> = {
  cross_border_ma: "Cross-Border M&A",
  pe_vc: "PE / VC",
  swf_coinvest: "SWF Co-Investment",
  distressed: "Distressed / Restructuring",
  infrastructure: "Infrastructure",
};

const fmt = (v: number | null | undefined) => {
  if (!v) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toLocaleString()}`;
};

export const GlobalDetailPanel = ({
  opportunity,
  open,
  onOpenChange,
}: {
  opportunity: GlobalOpportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  if (!opportunity) return null;
  const km = opportunity.key_metrics ?? {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{opportunity.name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Meta badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" />{opportunity.country}</Badge>
            <Badge variant="outline">{opportunity.region}</Badge>
            <Badge variant="outline" className={RISK_STYLES[opportunity.risk_rating ?? "medium"]}>
              {(opportunity.risk_rating ?? "medium").replace("_", " ")} risk
            </Badge>
            <Badge variant="secondary">{TYPE_LABELS[opportunity.opportunity_type] ?? opportunity.opportunity_type}</Badge>
          </div>

          {/* Description */}
          {opportunity.description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-foreground leading-relaxed">{opportunity.description}</p>
            </div>
          )}

          {/* Deal financials */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1"><DollarSign className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] text-muted-foreground">Deal Value (USD)</span></div>
              <p className="text-base font-bold font-mono">{fmt(opportunity.deal_value_usd)}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Local ({opportunity.local_currency})</span></div>
              <p className="text-base font-bold font-mono">{fmt(opportunity.deal_value_local)}</p>
            </div>
          </div>

          {/* Key metrics */}
          {Object.keys(km).length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2"><TrendingUp className="h-3.5 w-3.5 text-primary" /><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Metrics</p></div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(km).map(([k, v]) => (
                  <div key={k} className="rounded-md bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sovereign fund interest */}
          {opportunity.sovereign_fund_interest && opportunity.sovereign_fund_interest.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2"><Users className="h-3.5 w-3.5 text-primary" /><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sovereign Fund Interest</p></div>
              <div className="flex flex-wrap gap-1.5">
                {opportunity.sovereign_fund_interest.map((f) => (
                  <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Stage & status */}
          <div className="flex gap-3">
            <div className="rounded-md border border-border p-3 flex-1">
              <p className="text-[10px] text-muted-foreground mb-1">Stage</p>
              <p className="text-sm font-medium capitalize">{opportunity.stage?.replace("_", " ") ?? "—"}</p>
            </div>
            <div className="rounded-md border border-border p-3 flex-1">
              <p className="text-[10px] text-muted-foreground mb-1">Status</p>
              <p className="text-sm font-medium capitalize">{opportunity.status?.replace("_", " ") ?? "—"}</p>
            </div>
          </div>

          {/* Source link */}
          {opportunity.source_url && (
            <a href={opportunity.source_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> View Source
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
