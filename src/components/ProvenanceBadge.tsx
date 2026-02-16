import { ShieldCheck, ShieldAlert, ShieldQuestion, Clock, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SourceType = "api" | "sec_edgar" | "firecrawl" | "perplexity" | "manual" | "ai_generated" | "user_input" | "seeded" | string | null;
type ConfidenceLevel = "high" | "medium" | "low" | "estimated" | string | null;
type VerificationStatus = "verified" | "unverified" | "disputed" | string | null;

export interface ProvenanceData {
  source_type?: SourceType;
  source_url?: string | null;
  fetched_at?: string | null;
  verification_status?: VerificationStatus;
  confidence_score?: ConfidenceLevel;
  source?: string | null;
}

interface ProvenanceBadgeProps {
  data: ProvenanceData;
  compact?: boolean;
  className?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  api: "API Feed",
  sec_edgar: "SEC EDGAR",
  firecrawl: "Web Scrape",
  perplexity: "Web Search",
  manual: "Manual Entry",
  ai_generated: "AI Generated",
  user_input: "User Input",
  seeded: "Sample Data",
};

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string; icon: typeof ShieldCheck }> = {
  high: { label: "High", color: "text-success bg-success/10 border-success/30", icon: ShieldCheck },
  medium: { label: "Med", color: "text-warning bg-warning/10 border-warning/30", icon: ShieldAlert },
  low: { label: "Low", color: "text-destructive bg-destructive/10 border-destructive/30", icon: ShieldQuestion },
  estimated: { label: "Est.", color: "text-muted-foreground bg-muted/50 border-border", icon: ShieldQuestion },
};

function getTimeAgo(timestamp: string | null | undefined): string | null {
  if (!timestamp) return null;
  const ms = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function isFresh(fetchedAt: string | null | undefined, thresholdDays: number = 7): boolean {
  if (!fetchedAt) return false;
  const ms = Date.now() - new Date(fetchedAt).getTime();
  return ms < thresholdDays * 24 * 60 * 60 * 1000;
}

const ProvenanceBadge = ({ data, compact = false, className = "" }: ProvenanceBadgeProps) => {
  const key = (data.confidence_score ?? "medium").toLowerCase();
  const conf = CONFIDENCE_CONFIG[key] || CONFIDENCE_CONFIG.medium;
  const Icon = conf.icon;
  const sourceLabel = SOURCE_LABELS[data.source_type ?? ""] ?? data.source ?? data.source_type ?? "Unknown";
  const timeAgo = getTimeAgo(data.fetched_at);
  const fresh = isFresh(data.fetched_at, 7);
  const isSeeded = data.source_type === "seeded";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium cursor-default ${conf.color} ${className}`}>
            <Icon className="h-2.5 w-2.5" />
            {!compact && conf.label}
            {!compact && isSeeded && (
              <span className="opacity-60">· Sample</span>
            )}
            {!compact && !isSeeded && !fresh && timeAgo && (
              <Clock className="h-2.5 w-2.5 ml-0.5 opacity-60" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1.5 py-0.5">
            <p className="text-xs font-semibold">Data Provenance</p>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
              <span className="text-muted-foreground">Source:</span>
              <span className="font-medium">{sourceLabel}</span>
              <span className="text-muted-foreground">Confidence:</span>
              <span className="font-medium capitalize">{data.confidence_score ?? "medium"}</span>
              <span className="text-muted-foreground">Verification:</span>
              <span className={`font-medium capitalize ${
                data.verification_status === "verified" ? "text-success" :
                data.verification_status === "disputed" ? "text-destructive" :
                "text-muted-foreground"
              }`}>{data.verification_status ?? "unverified"}</span>
              {timeAgo && (
                <>
                  <span className="text-muted-foreground">Freshness:</span>
                  <span className={`font-medium ${fresh ? "text-success" : "text-warning"}`}>{timeAgo}</span>
                </>
              )}
            </div>
            {data.source_url && (
              <a
                href={data.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                View source
              </a>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ProvenanceBadge;
export { getTimeAgo, isFresh, SOURCE_LABELS };
