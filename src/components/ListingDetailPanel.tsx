import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatCurrency } from "@/hooks/useData";
import RequestIntroButton from "@/components/RequestIntroButton";
import AddToPipelineButton from "@/components/AddToPipelineButton";
import SetAlertButton from "@/components/SetAlertButton";
import MarketContextPanel from "@/components/MarketContextPanel";
import REUnderwritingTools from "@/components/REUnderwritingTools";
import { exportREUnderwritingPack } from "@/lib/moduleExports";

interface PrivateListing {
  id: string;
  property_name: string;
  property_type?: string | null;
  city: string;
  state: string;
  address?: string | null;
  asking_price?: number | null;
  estimated_cap_rate?: number | null;
  size_sf?: number | null;
  units?: number | null;
  year_built?: number | null;
  status: string;
  description?: string | null;
  source_network?: string | null;
  listed_date?: string | null;
  noi?: number | null;
  loan_amount?: number | null;
  interest_rate?: number | null;
  loan_term_years?: number | null;
  amortization_years?: number | null;
  occupancy_pct?: number | null;
  opex_ratio?: number | null;
  rent_growth_pct?: number | null;
  exit_cap_rate?: number | null;
  hold_years?: number | null;
}

interface ListingDetailPanelProps {
  listing: PrivateListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColor: Record<string, string> = {
  available: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  under_contract: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sold: "bg-muted text-muted-foreground border-border",
};

export const ListingDetailPanel = ({ listing, open, onOpenChange }: ListingDetailPanelProps) => {
  if (!listing) return null;

  const hasUnderwritingData = listing.asking_price && listing.noi && listing.estimated_cap_rate;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{listing.property_name}</SheetTitle>
          <SheetDescription>{listing.city}, {listing.state}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Type & Status */}
          <div className="flex gap-2 flex-wrap items-center">
            <Badge variant="outline">{listing.property_type || "Unknown"}</Badge>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${statusColor[listing.status] || ""}`}>
              {listing.status?.replace("_", " ")}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto gap-1.5 h-7 text-xs"
              onClick={() => exportREUnderwritingPack(listing as any)}
            >
              <Download className="h-3 w-3" /> Export Pack
            </Button>
          </div>

          {/* Address */}
          {listing.address && (
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Address</p>
              <p className="text-sm font-mono text-foreground">{listing.address}</p>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Asking Price</p>
              <p className="text-lg font-bold font-mono text-foreground mt-1">{formatCurrency(listing.asking_price)}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Cap Rate</p>
              <p className="text-lg font-bold font-mono text-foreground mt-1">{listing.estimated_cap_rate ? `${listing.estimated_cap_rate.toFixed(2)}%` : "—"}</p>
            </div>
            {listing.size_sf && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Size</p>
                <p className="text-lg font-bold font-mono text-foreground mt-1">{listing.size_sf.toLocaleString()} sf</p>
              </div>
            )}
            {listing.units && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Units</p>
                <p className="text-lg font-bold font-mono text-foreground mt-1">{listing.units}</p>
              </div>
            )}
            {listing.noi && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Annual NOI</p>
                <p className="text-lg font-bold font-mono text-foreground mt-1">{formatCurrency(listing.noi)}</p>
              </div>
            )}
            {listing.year_built && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Year Built</p>
                <p className="text-lg font-bold font-mono text-foreground mt-1">{listing.year_built}</p>
              </div>
            )}
          </div>

          {/* Underwriting Tools */}
          {hasUnderwritingData && (
            <REUnderwritingTools
              askingPrice={listing.asking_price!}
              noi={listing.noi!}
              capRate={listing.estimated_cap_rate!}
              loanAmount={listing.loan_amount ?? undefined}
              interestRate={listing.interest_rate ?? undefined}
              loanTermYears={listing.loan_term_years ?? undefined}
              amortizationYears={listing.amortization_years ?? undefined}
              occupancyPct={listing.occupancy_pct ?? undefined}
              opexRatio={listing.opex_ratio ?? undefined}
              rentGrowthPct={listing.rent_growth_pct ?? undefined}
              exitCapRate={listing.exit_cap_rate ?? undefined}
              holdYears={listing.hold_years ?? undefined}
            />
          )}

          {/* Market Context */}
          <MarketContextPanel
            city={listing.city}
            state={listing.state}
            propertyType={listing.property_type}
          />

          {/* Quick Actions */}
          <div className="pt-2 space-y-2">
            <div className="flex gap-2">
              <AddToPipelineButton
                entityName={listing.property_name || `${listing.property_type} · ${listing.city}, ${listing.state}`}
                entityType="private_listing"
                entityId={listing.id}
                sector="Real Estate"
                description={listing.description}
                compact
              />
              <SetAlertButton entityName={listing.property_name || listing.property_type || "Listing"} compact />
            </div>
            {listing.status === "available" && (
              <RequestIntroButton
                entityType="private_listing"
                entityId={listing.id}
                entityName={listing.property_name || `${listing.property_type} · ${listing.city}, ${listing.state}`}
              />
            )}
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
            {listing.listed_date && <p>Listed: {new Date(listing.listed_date).toLocaleDateString()}</p>}
            {listing.source_network && <p>Source: {listing.source_network}</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
