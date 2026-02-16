import { AlertTriangle, Info, ShieldQuestion, X } from "lucide-react";
import { useState } from "react";
import {
  type ProvenanceMetadata,
  type DataCategory,
  type QualityWarning,
  assessDataQuality,
} from "@/lib/dataQuality";

interface DataQualityBannerProps {
  records: Record<string, any>[];
  category: DataCategory;
  label?: string;
  className?: string;
}

/**
 * Aggregate quality banner for a dataset.
 * Shows warnings when a significant portion of records are stale, low-confidence, or unverified.
 */
const DataQualityBanner = ({ records, category, label = "dataset", className = "" }: DataQualityBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || records.length === 0) return null;

  let staleCount = 0;
  let lowConfCount = 0;
  let unverifiedCount = 0;
  let disputedCount = 0;

  records.forEach((r) => {
    const provenance: ProvenanceMetadata = {
      sourceType: r.source_type ?? null,
      sourceUrl: r.source_url ?? null,
      fetchedAt: r.fetched_at ?? r.scraped_at ?? r.updated_at ?? r.created_at ?? null,
      verificationStatus: r.verification_status ?? null,
      confidenceScore: r.confidence_score ?? null,
      source: r.source ?? r.source_name ?? null,
    };
    const a = assessDataQuality(provenance, category);
    if (a.isStale) staleCount++;
    if (!a.meetsMinConfidence) lowConfCount++;
    if (a.verificationStatus === "unverified") unverifiedCount++;
    if (a.verificationStatus === "disputed") disputedCount++;
  });

  const total = records.length;
  const stalePct = Math.round((staleCount / total) * 100);
  const warnings: { icon: typeof AlertTriangle; text: string; severity: "warn" | "error" | "info" }[] = [];

  if (disputedCount > 0) {
    warnings.push({
      icon: AlertTriangle,
      text: `${disputedCount} record${disputedCount > 1 ? "s" : ""} with conflicting sources`,
      severity: "error",
    });
  }

  if (stalePct > 30) {
    warnings.push({
      icon: AlertTriangle,
      text: `${stalePct}% of ${label} data may be stale`,
      severity: "warn",
    });
  }

  if (lowConfCount > total * 0.5) {
    warnings.push({
      icon: ShieldQuestion,
      text: `${Math.round((lowConfCount / total) * 100)}% below minimum confidence threshold`,
      severity: "warn",
    });
  }

  if (warnings.length === 0) return null;

  const topSeverity = warnings.some(w => w.severity === "error") ? "error" : "warn";

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${
        topSeverity === "error"
          ? "bg-destructive/10 border-destructive/30 text-destructive"
          : "bg-warning/10 border-warning/30 text-warning"
      } ${className}`}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="font-medium">Data Quality Notice</p>
        {warnings.map((w, i) => (
          <p key={i} className="text-[11px] opacity-80">{w.text}</p>
        ))}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default DataQualityBanner;
