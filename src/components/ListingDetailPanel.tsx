import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Home, DollarSign, Maximize2, Building, Calendar } from "lucide-react";
import { formatCurrency } from "@/hooks/useData";
import RequestIntroButton from "@/components/RequestIntroButton";

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{listing.property_name}</SheetTitle>
          <SheetDescription>{listing.city}, {listing.state}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Type & Status */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{listing.property_type || "Unknown"}</Badge>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${statusColor[listing.status] || ""}`}>
              {listing.status?.replace("_", " ")}
            </span>
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

          {/* Description */}
          {listing.description && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
            </div>
          )}

          {/* Request Intro */}
          {listing.status === "available" && (
            <div className="pt-2">
              <RequestIntroButton
                entityType="private_listing"
                entityId={listing.id}
                entityName={listing.property_name || `${listing.property_type} · ${listing.city}, ${listing.state}`}
              />
            </div>
          )}

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
