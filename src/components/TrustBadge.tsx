import { ShieldCheck, ShieldAlert, ShieldQuestion, Clock, ExternalLink, AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type ProvenanceMetadata,
  type DataCategory,
  type QualityAssessment,
  assessDataQuality,
  getTimeAgo,
  getConfidenceColor,
  getVerificationColor,
} from "@/lib/dataQuality";

interface TrustBadgeProps {
  provenance: ProvenanceMetadata;
  category: DataCategory;
  compact?: boolean;
  showSource?: boolean;
  className?: string;
}

const verificationIcons = {
  verified: ShieldCheck,
  unverified: ShieldQuestion,
  disputed: ShieldAlert,
  stale: Clock,
};

const TrustBadge = ({ provenance, category, compact = false, showSource = true, className = "" }: TrustBadgeProps) => {
  const assessment = assessDataQuality(provenance, category);
  const Icon = verificationIcons[assessment.verificationStatus] ?? ShieldQuestion;
  const timeAgo = getTimeAgo(provenance.fetchedAt);
  const confColor = getConfidenceColor(assessment.confidenceTier);
  const verifColor = getVerificationColor(assessment.verificationStatus);

  if (compact) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium cursor-default ${confColor} ${className}`}>
              <Icon className="h-2.5 w-2.5" />
              {assessment.confidenceTier.charAt(0).toUpperCase() + assessment.confidenceTier.slice(1)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <TrustTooltipContent assessment={assessment} provenance={provenance} timeAgo={timeAgo} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${confColor} ${className}`}>
            <Icon className={`h-3.5 w-3.5 ${verifColor}`} />
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{assessment.confidenceTier.charAt(0).toUpperCase() + assessment.confidenceTier.slice(1)}</span>
              {assessment.isStale && (
                <span className="flex items-center gap-0.5 text-warning">
                  <Clock className="h-3 w-3" />
                  <span className="text-[10px]">Stale</span>
                </span>
              )}
              {showSource && (
                <span className="text-muted-foreground text-[10px]">
                  via {assessment.sourceLabel}
                </span>
              )}
            </div>
            {assessment.warnings.some(w => w.severity === "error") && (
              <AlertTriangle className="h-3 w-3 text-destructive" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <TrustTooltipContent assessment={assessment} provenance={provenance} timeAgo={timeAgo} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const TrustTooltipContent = ({
  assessment,
  provenance,
  timeAgo,
}: {
  assessment: QualityAssessment;
  provenance: ProvenanceMetadata;
  timeAgo: string | null;
}) => (
  <div className="space-y-2 py-1">
    <div className="space-y-1">
      <p className="text-xs font-semibold">Data Trust Assessment</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <span className="text-muted-foreground">Confidence:</span>
        <span className="font-medium capitalize">{assessment.confidenceTier}</span>
        <span className="text-muted-foreground">Verification:</span>
        <span className={`font-medium capitalize ${getVerificationColor(assessment.verificationStatus)}`}>
          {assessment.verificationStatus}
        </span>
        <span className="text-muted-foreground">Source:</span>
        <span className="font-medium">{assessment.sourceLabel}</span>
        {timeAgo && (
          <>
            <span className="text-muted-foreground">Last fetched:</span>
            <span className={`font-medium ${assessment.isStale ? "text-warning" : ""}`}>{timeAgo}</span>
          </>
        )}
        {assessment.isStale && (
          <>
            <span className="text-muted-foreground">Stale threshold:</span>
            <span className="font-medium text-warning">{assessment.stalenessThreshold}</span>
          </>
        )}
      </div>
    </div>

    {provenance.sourceUrl && (
      <a
        href={provenance.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        View source
      </a>
    )}

    {assessment.warnings.length > 0 && (
      <div className="space-y-1 border-t border-border pt-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">Warnings</p>
        {assessment.warnings.map((w, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[11px]">
            {w.severity === "error" ? (
              <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
            ) : w.severity === "warn" ? (
              <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
            <span className={w.severity === "error" ? "text-destructive" : w.severity === "warn" ? "text-warning" : "text-muted-foreground"}>
              {w.message}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default TrustBadge;

/** Inline compact badge for use next to individual metric values */
export const MetricTrustIndicator = ({
  provenance,
  category,
  className = "",
}: {
  provenance: ProvenanceMetadata;
  category: DataCategory;
  className?: string;
}) => {
  const assessment = assessDataQuality(provenance, category);

  if (!assessment.warnings.length && assessment.confidenceTier === "high" && !assessment.isStale) {
    return null; // Clean data, no badge needed
  }

  return <TrustBadge provenance={provenance} category={category} compact className={className} />;
};
