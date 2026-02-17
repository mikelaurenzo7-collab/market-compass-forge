/**
 * Data Quality Guardrails
 * Staleness detection, confidence thresholds, and conflicting-source warnings.
 */

// ── Staleness thresholds (in milliseconds) by data category ──

export type DataCategory =
  | "market"       // sector multiples, deal flow — 24h
  | "financials"   // financials, funding_rounds — 90 days
  | "news"         // news_articles, intelligence_signals — 7 days
  | "alternative"  // distressed, CRE, global opportunities — 30 days
  | "fund"         // funds, deal_transactions — 30 days
  | "enrichment";  // company_enrichments — 14 days

const STALENESS_MS: Record<DataCategory, number> = {
  market:      24 * 60 * 60 * 1000,        // 24 hours
  financials:  90 * 24 * 60 * 60 * 1000,   // 90 days
  news:         7 * 24 * 60 * 60 * 1000,   // 7 days
  alternative: 30 * 24 * 60 * 60 * 1000,   // 30 days
  fund:        30 * 24 * 60 * 60 * 1000,   // 30 days
  enrichment:  14 * 24 * 60 * 60 * 1000,   // 14 days
};

const STALENESS_LABELS: Record<DataCategory, string> = {
  market:      "24 hours",
  financials:  "90 days",
  news:        "7 days",
  alternative: "30 days",
  fund:        "30 days",
  enrichment:  "14 days",
};

// ── Confidence tiers ──

export type ConfidenceTier = "high" | "medium" | "low" | "estimated";

const CONFIDENCE_ORDER: Record<string, number> = {
  high: 4,
  medium: 3,
  low: 2,
  estimated: 1,
};

// ── Verification statuses ──

export type VerificationStatus = "verified" | "unverified" | "disputed" | "stale";

// ── Source types ──

export type SourceType = "api" | "sec_edgar" | "firecrawl" | "perplexity" | "manual" | "ai_generated" | "user_input";

const SOURCE_LABELS: Record<SourceType, string> = {
  api:          "API Feed",
  sec_edgar:    "SEC EDGAR",
  firecrawl:    "Web Scrape",
  perplexity:   "Web Search",
  manual:       "Manual Entry",
  ai_generated: "AI Generated",
  user_input:   "User Input",
};

// ── Provenance metadata shape ──

export interface ProvenanceMetadata {
  sourceType: SourceType | string | null;
  sourceUrl: string | null;
  fetchedAt: string | null;           // ISO timestamp
  verificationStatus: VerificationStatus | string | null;
  confidenceScore: ConfidenceTier | string | null;
  source?: string | null;             // human-readable source name
}

// ── Quality assessment result ──

export interface QualityAssessment {
  isStale: boolean;
  staleSince: string | null;         // human-readable duration
  stalenessThreshold: string;        // e.g. "24 hours"
  confidenceTier: ConfidenceTier;
  meetsMinConfidence: boolean;       // meets threshold for scoring/memos
  verificationStatus: VerificationStatus;
  sourceLabel: string;
  warnings: QualityWarning[];
}

export interface QualityWarning {
  type: "stale" | "low_confidence" | "unverified" | "ai_generated" | "conflicting_source" | "missing_source";
  message: string;
  severity: "info" | "warn" | "error";
}

// ── Core assessment function ──

export function assessDataQuality(
  provenance: ProvenanceMetadata,
  category: DataCategory,
  minConfidence: ConfidenceTier = "low"
): QualityAssessment {
  const warnings: QualityWarning[] = [];

  // Staleness check
  const threshold = STALENESS_MS[category];
  const thresholdLabel = STALENESS_LABELS[category];
  let isStale = false;
  let staleSince: string | null = null;

  if (provenance.fetchedAt) {
    const fetchedMs = new Date(provenance.fetchedAt).getTime();
    const ageMs = Date.now() - fetchedMs;
    isStale = ageMs > threshold;
    if (isStale) {
      staleSince = formatDuration(ageMs);
      warnings.push({
        type: "stale",
        message: `Data is ${staleSince} old (threshold: ${thresholdLabel})`,
        severity: "warn",
      });
    }
  } else {
    warnings.push({
      type: "stale",
      message: "No fetch timestamp available",
      severity: "info",
    });
  }

  // Confidence check
  const rawConfidence = (provenance.confidenceScore ?? "medium").toLowerCase();
  const confidenceTier = (["high", "medium", "low", "estimated"].includes(rawConfidence)
    ? rawConfidence
    : "medium") as ConfidenceTier;

  const meetsMinConfidence =
    (CONFIDENCE_ORDER[confidenceTier] ?? 0) >= (CONFIDENCE_ORDER[minConfidence] ?? 0);

  if (!meetsMinConfidence) {
    warnings.push({
      type: "low_confidence",
      message: `Confidence "${confidenceTier}" is below minimum "${minConfidence}"`,
      severity: "warn",
    });
  }

  // Verification check
  const rawVerification = (provenance.verificationStatus ?? "unverified").toLowerCase();
  const verificationStatus = (["verified", "unverified", "disputed", "stale"].includes(rawVerification)
    ? rawVerification
    : "unverified") as VerificationStatus;

  if (verificationStatus === "unverified") {
    warnings.push({
      type: "unverified",
      message: "Data has not been independently verified",
      severity: "info",
    });
  } else if (verificationStatus === "disputed") {
    warnings.push({
      type: "conflicting_source",
      message: "Conflicting data from multiple sources detected",
      severity: "error",
    });
  }

  // Source type check
  const sourceType = (provenance.sourceType ?? "manual") as SourceType;
  const sourceLabel = SOURCE_LABELS[sourceType] ?? provenance.source ?? sourceType;

  if (sourceType === "ai_generated") {
    warnings.push({
      type: "ai_generated",
      message: "This metric was generated by AI and may need manual verification",
      severity: "info",
    });
  }

  if (!provenance.sourceType && !provenance.source) {
    warnings.push({
      type: "missing_source",
      message: "No data source recorded",
      severity: "warn",
    });
  }

  return {
    isStale,
    staleSince,
    stalenessThreshold: thresholdLabel,
    confidenceTier,
    meetsMinConfidence,
    verificationStatus,
    sourceLabel,
    warnings,
  };
}

// ── Helpers ──

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function getTimeAgo(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const ms = Date.now() - new Date(timestamp).getTime();
  return formatDuration(ms) + " ago";
}

export function getConfidenceColor(tier: ConfidenceTier | string): string {
  switch (tier) {
    case "high":      return "text-success bg-success/10 border-success/30";
    case "medium":    return "text-warning bg-warning/10 border-warning/30";
    case "low":       return "text-destructive bg-destructive/10 border-destructive/30";
    case "estimated": return "text-muted-foreground bg-muted/50 border-border";
    default:          return "text-muted-foreground bg-muted/50 border-border";
  }
}

export function getVerificationColor(status: VerificationStatus | string): string {
  switch (status) {
    case "verified":   return "text-success";
    case "unverified": return "text-muted-foreground";
    case "disputed":   return "text-destructive";
    case "stale":      return "text-warning";
    default:           return "text-muted-foreground";
  }
}

export function getWarningIcon(severity: "info" | "warn" | "error"): string {
  switch (severity) {
    case "error": return "🔴";
    case "warn":  return "🟡";
    case "info":  return "🔵";
  }
}

/** Extract provenance metadata from any record that may have provenance columns */
export function extractProvenance(record: Record<string, any>): ProvenanceMetadata {
  return {
    sourceType:         record.source_type ?? null,
    sourceUrl:          record.source_url ?? null,
    fetchedAt:          record.fetched_at ?? record.scraped_at ?? record.updated_at ?? record.created_at ?? null,
    verificationStatus: record.verification_status ?? null,
    confidenceScore:    record.confidence_score ?? null,
    source:             record.source ?? record.source_name ?? null,
  };
}
