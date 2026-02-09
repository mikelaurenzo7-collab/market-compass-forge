import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

type ConfidenceLevel = "high" | "medium" | "low" | "estimated" | string | null;

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  source?: string | null;
  scrapedAt?: string | null;
  compact?: boolean;
}

const config: Record<string, { label: string; color: string; icon: typeof ShieldCheck; description: string }> = {
  high: {
    label: "High",
    color: "text-success bg-success/10 border-success/30",
    icon: ShieldCheck,
    description: "Verified from primary source or official filings",
  },
  medium: {
    label: "Medium",
    color: "text-warning bg-warning/10 border-warning/30",
    icon: ShieldAlert,
    description: "Aggregated from reputable secondary sources",
  },
  low: {
    label: "Low",
    color: "text-destructive bg-destructive/10 border-destructive/30",
    icon: ShieldQuestion,
    description: "Unverified or from a single informal source",
  },
  estimated: {
    label: "Est.",
    color: "text-muted-foreground bg-muted/50 border-border",
    icon: ShieldQuestion,
    description: "Estimated or modeled — not from a direct source",
  },
};

const ConfidenceBadge = ({ level, source, scrapedAt, compact = false }: ConfidenceBadgeProps) => {
  const key = (level ?? "medium").toLowerCase();
  const c = config[key] || config.medium;
  const Icon = c.icon;

  const timeAgo = scrapedAt
    ? (() => {
        const diff = Date.now() - new Date(scrapedAt).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
      })()
    : null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium cursor-default ${c.color}`}
          >
            <Icon className="h-2.5 w-2.5" />
            {!compact && c.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="text-xs font-medium">Confidence: {c.label}</p>
            <p className="text-[11px] text-muted-foreground">{c.description}</p>
            {source && (
              <p className="text-[11px] text-muted-foreground">
                Source: <span className="text-foreground">{source}</span>
              </p>
            )}
            {timeAgo && (
              <p className="text-[11px] text-muted-foreground">
                Last updated: <span className="text-foreground">{timeAgo}</span>
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ConfidenceBadge;
