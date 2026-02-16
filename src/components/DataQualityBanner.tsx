import { AlertTriangle, Info, ShieldQuestion, X, Shield, CheckCircle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [expanded, setExpanded] = useState(false);

  if (dismissed || records.length === 0) return null;

  let staleCount = 0;
  let lowConfCount = 0;
  let unverifiedCount = 0;
  let disputedCount = 0;
  let syntheticCount = 0;
  let highConfCount = 0;

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
    if (r.is_synthetic) syntheticCount++;
    if (r.confidence_score === "high") highConfCount++;
  });

  const total = records.length;
  const stalePct = Math.round((staleCount / total) * 100);
  const highConfPct = Math.round((highConfCount / total) * 100);
  const warnings: { icon: typeof AlertTriangle; text: string; severity: "warn" | "error" | "info" }[] = [];

  if (disputedCount > 0) {
    warnings.push({
      icon: AlertTriangle,
      text: `${disputedCount} record${disputedCount > 1 ? "s" : ""} with conflicting sources`,
      severity: "error",
    });
  }

  if (syntheticCount > total * 0.5) {
    warnings.push({
      icon: Info,
      text: `${Math.round((syntheticCount / total) * 100)}% of ${label} is sample/demo data`,
      severity: "warn",
    });
  }

  if (stalePct > 30) {
    warnings.push({
      icon: AlertTriangle,
      text: `${stalePct}% of ${label} data may be stale (>30 days old)`,
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

  // Show positive signal if data quality is good
  if (warnings.length === 0 && total > 0) {
    if (highConfPct > 50) {
      return (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs ${className}`}
          >
            <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
            <p className="text-success/80 font-medium flex-1">
              {highConfPct}% high-confidence data · {total} records verified
            </p>
          </motion.div>
        </AnimatePresence>
      );
    }
    return null;
  }

  const topSeverity = warnings.some(w => w.severity === "error") ? "error" : "warn";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className={`rounded-lg border px-3 py-2.5 text-xs ${
          topSeverity === "error"
            ? "bg-destructive/10 border-destructive/30 text-destructive"
            : "bg-warning/10 border-warning/30 text-warning"
        } ${className}`}
      >
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Data Quality Notice</p>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] opacity-60 hover:opacity-100 transition-opacity underline"
              >
                {expanded ? "Less" : "Details"}
              </button>
            </div>
            <p className="text-[11px] opacity-80">{warnings[0]?.text}</p>
            {expanded && warnings.length > 1 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-0.5 pt-1"
              >
                {warnings.slice(1).map((w, i) => (
                  <p key={i} className="text-[11px] opacity-70 flex items-center gap-1">
                    <w.icon className="h-3 w-3" />
                    {w.text}
                  </p>
                ))}
              </motion.div>
            )}
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DataQualityBanner;
