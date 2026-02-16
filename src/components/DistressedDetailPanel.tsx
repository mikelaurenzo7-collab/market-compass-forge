import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatCurrency } from "@/hooks/useData";
import RequestIntroButton from "@/components/RequestIntroButton";
import AddToPipelineButton from "@/components/AddToPipelineButton";
import SetAlertButton from "@/components/SetAlertButton";
import DistressedAnalytics from "@/components/DistressedAnalytics";
import { exportDistressedMemo } from "@/lib/moduleExports";
import { ClaimStackEntry } from "@/lib/underwriting";

interface DistressedAsset {
  id: string;
  name: string;
  asset_type?: string | null;
  distress_type?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  asking_price?: number | null;
  estimated_value?: number | null;
  discount_pct?: number | null;
  status: string;
  sector?: string | null;
  description?: string | null;
  contact_info?: string | null;
  key_metrics?: Record<string, any> | null;
  source?: string | null;
  listed_date?: string | null;
  claim_stack?: any;
  legal_stage?: string | null;
  legal_timeline?: any;
  recovery_low_pct?: number | null;
  recovery_high_pct?: number | null;
  process_milestones?: any;
}

interface DistressedDetailPanelProps {
  asset: DistressedAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColor: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  under_contract: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  sold: "bg-muted text-muted-foreground border-border",
};

export const DistressedDetailPanel = ({ asset, open, onOpenChange }: DistressedDetailPanelProps) => {
  if (!asset) return null;

  const claimStack = (Array.isArray(asset.claim_stack) ? asset.claim_stack : []) as ClaimStackEntry[];
  const legalTimeline = (Array.isArray(asset.legal_timeline) ? asset.legal_timeline : []) as { stage: string; date: string; description?: string }[];
  const milestones = (Array.isArray(asset.process_milestones) ? asset.process_milestones : []) as { label: string; target_date?: string; completed_date?: string; status: string }[];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{asset.name}</SheetTitle>
          <SheetDescription>{asset.sector || "No sector"}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status & Type */}
          <div className="flex gap-2 flex-wrap items-center">
            <Badge variant="outline">{asset.asset_type?.replace("_", " ") || "Unknown"}</Badge>
            <Badge variant="outline">{asset.distress_type?.replace("_", " ") || "Unknown"}</Badge>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${statusColor[asset.status] || ""}`}>
              {asset.status?.replace("_", " ")}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto gap-1.5 h-7 text-xs"
              onClick={() => exportDistressedMemo(asset as any)}
            >
              <Download className="h-3 w-3" /> Export Memo
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Asking Price</p>
              <p className="text-lg font-bold font-mono text-foreground mt-1">{formatCurrency(asset.asking_price)}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Est. Value</p>
              <p className="text-lg font-bold font-mono text-foreground mt-1">{formatCurrency(asset.estimated_value)}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Discount</p>
              <p className="text-lg font-bold font-mono text-destructive mt-1">{asset.discount_pct}%</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Location</p>
              <p className="text-xs font-mono text-foreground mt-1">{asset.location_city}, {asset.location_state}</p>
            </div>
          </div>

          {/* Analytics: claim stack, legal timeline, recovery, milestones */}
          <DistressedAnalytics
            claimStack={claimStack}
            legalStage={asset.legal_stage ?? "pre_filing"}
            legalTimeline={legalTimeline}
            recoveryLow={asset.recovery_low_pct ?? null}
            recoveryHigh={asset.recovery_high_pct ?? null}
            processMilestones={milestones}
            estimatedValue={asset.estimated_value ?? null}
          />

          {/* Description */}
          {asset.description && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{asset.description}</p>
            </div>
          )}

          {/* Key Metrics JSON */}
          {asset.key_metrics && Object.keys(asset.key_metrics).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Key Metrics</h4>
              <div className="space-y-2">
                {Object.entries(asset.key_metrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                    <span className="font-mono text-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Info */}
          {asset.contact_info && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Contact Information</h4>
              <p className="text-sm font-mono text-muted-foreground">{asset.contact_info}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-2 space-y-2">
            <div className="flex gap-2">
              <AddToPipelineButton
                entityName={asset.name}
                entityType="distressed_asset"
                entityId={asset.id}
                sector={asset.sector}
                description={asset.description}
                compact
              />
              <SetAlertButton entityName={asset.name} compact />
            </div>
            {asset.status === "active" && (
              <RequestIntroButton
                entityType="distressed_asset"
                entityId={asset.id}
                entityName={asset.name}
              />
            )}
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
            {asset.listed_date && <p>Listed: {new Date(asset.listed_date).toLocaleDateString()}</p>}
            {asset.source && <p>Source: {asset.source}</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
