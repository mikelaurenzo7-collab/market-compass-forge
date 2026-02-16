/**
 * Citation Engine v1.0.0
 * 
 * Generates machine-readable citations for every numeric claim in memos/research.
 * Each citation includes: metric name, value, source table, confidence level, verified timestamp.
 */

export const CITATION_ENGINE_VERSION = "v1.0.0";

export interface Citation {
  id: string;
  metric: string;
  value: number | string;
  formattedValue: string;
  source: string;       // e.g. "financials", "funding_rounds", "kpi_metrics"
  sourceField: string;  // e.g. "arr", "amount"
  period?: string;
  confidence: "high" | "medium" | "low" | "unverified";
  verifiedAt: string;   // ISO timestamp of when data was last fetched/verified
  sourceType?: string;  // "sec_filing", "manual", "api", etc.
  note?: string;
}

export interface CitationContext {
  citations: Citation[];
  lowConfidenceMetrics: string[];
  uncitedWarnings: string[];
}

// Generate a unique citation ID
let citationCounter = 0;
function nextCitationId(): string {
  return `cite_${++citationCounter}_${Date.now().toString(36)}`;
}

// Reset counter (for testing)
export function resetCitationCounter() {
  citationCounter = 0;
}

/**
 * Build citation context from raw company data pulled for memo generation.
 */
export function buildCitationContext(
  company: any,
  financials: any[],
  fundingRounds: any[],
  kpis: any[],
  capTable: any[],
): CitationContext {
  const citations: Citation[] = [];
  const lowConfidenceMetrics: string[] = [];

  const fmtCurrency = (v: number) => {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v}`;
  };

  // Company-level citations
  if (company.employee_count) {
    const c: Citation = {
      id: nextCitationId(),
      metric: "employee_count",
      value: company.employee_count,
      formattedValue: company.employee_count.toLocaleString(),
      source: "companies",
      sourceField: "employee_count",
      confidence: company.confidence_score ?? "medium",
      verifiedAt: company.updated_at ?? new Date().toISOString(),
    };
    citations.push(c);
    if (c.confidence === "low" || c.confidence === "unverified") lowConfidenceMetrics.push(`Employee count (${c.confidence})`);
  }

  // Financial citations
  for (const f of financials) {
    const conf = (f.confidence_score ?? "medium") as Citation["confidence"];
    const verified = f.fetched_at ?? f.created_at ?? new Date().toISOString();
    const fields: { key: string; label: string }[] = [
      { key: "revenue", label: "Revenue" },
      { key: "arr", label: "ARR" },
      { key: "ebitda", label: "EBITDA" },
      { key: "gross_margin", label: "Gross Margin" },
      { key: "burn_rate", label: "Burn Rate" },
      { key: "mrr", label: "MRR" },
      { key: "runway_months", label: "Runway" },
    ];
    for (const { key, label } of fields) {
      if (f[key] != null && f[key] !== 0) {
        const isPercent = key === "gross_margin";
        const formatted = isPercent ? `${(f[key] * 100).toFixed(0)}%` : key === "runway_months" ? `${f[key]} months` : fmtCurrency(f[key]);
        const c: Citation = {
          id: nextCitationId(),
          metric: `${label} (${f.period})`,
          value: f[key],
          formattedValue: formatted,
          source: "financials",
          sourceField: key,
          period: f.period,
          confidence: conf,
          verifiedAt: verified,
          sourceType: f.source_type ?? "manual",
        };
        citations.push(c);
        if (conf === "low" || conf === "unverified") lowConfidenceMetrics.push(`${label} ${f.period} (${conf})`);
      }
    }
  }

  // Funding round citations
  for (const r of fundingRounds) {
    const conf = (r.confidence_score ?? "medium") as Citation["confidence"];
    const verified = r.fetched_at ?? r.created_at ?? new Date().toISOString();
    if (r.amount) {
      const c: Citation = {
        id: nextCitationId(),
        metric: `${r.round_type} Raise`,
        value: r.amount,
        formattedValue: fmtCurrency(r.amount),
        source: "funding_rounds",
        sourceField: "amount",
        period: r.date,
        confidence: conf,
        verifiedAt: verified,
        sourceType: r.source_type ?? "manual",
      };
      citations.push(c);
      if (conf === "low" || conf === "unverified") lowConfidenceMetrics.push(`${r.round_type} amount (${conf})`);
    }
    if (r.valuation_post) {
      citations.push({
        id: nextCitationId(),
        metric: `${r.round_type} Post-Money Valuation`,
        value: r.valuation_post,
        formattedValue: fmtCurrency(r.valuation_post),
        source: "funding_rounds",
        sourceField: "valuation_post",
        period: r.date,
        confidence: conf,
        verifiedAt: verified,
        sourceType: r.source_type ?? "manual",
      });
    }
  }

  // KPI citations
  for (const k of kpis) {
    const conf = (k.confidence_score ?? "medium") as Citation["confidence"];
    citations.push({
      id: nextCitationId(),
      metric: `${k.metric_name} (${k.period})`,
      value: k.value,
      formattedValue: String(k.value),
      source: "kpi_metrics",
      sourceField: k.metric_name,
      period: k.period,
      confidence: conf,
      verifiedAt: k.created_at ?? new Date().toISOString(),
      sourceType: k.definition_source ?? "manual",
    });
    if (conf === "low" || conf === "unverified") lowConfidenceMetrics.push(`${k.metric_name} ${k.period} (${conf})`);
  }

  // Cap table citations
  for (const ct of capTable) {
    if (ct.ownership_pct) {
      citations.push({
        id: nextCitationId(),
        metric: `${ct.shareholder_name} Ownership`,
        value: ct.ownership_pct,
        formattedValue: `${(ct.ownership_pct * 100).toFixed(1)}%`,
        source: "cap_table_snapshots",
        sourceField: "ownership_pct",
        period: ct.snapshot_date,
        confidence: "medium",
        verifiedAt: ct.created_at ?? new Date().toISOString(),
      });
    }
  }

  return { citations, lowConfidenceMetrics, uncitedWarnings: [] };
}

/**
 * Build a citation appendix block for inclusion in AI prompts.
 * Forces the AI to reference citation IDs.
 */
export function buildCitationPromptBlock(ctx: CitationContext): string {
  const lines = ctx.citations.map(c =>
    `[${c.id}] ${c.metric}: ${c.formattedValue} (source: ${c.source}.${c.sourceField}, confidence: ${c.confidence}, verified: ${c.verifiedAt.split("T")[0]})`
  );

  const lowConfBlock = ctx.lowConfidenceMetrics.length > 0
    ? `\n\nLOW-CONFIDENCE METRICS (must be labeled as estimates or excluded):\n${ctx.lowConfidenceMetrics.map(m => `⚠️ ${m}`).join("\n")}`
    : "";

  return `\nCITATION REFERENCE TABLE:\n${lines.join("\n")}${lowConfBlock}`;
}

/**
 * Validate that output text references citation IDs for numeric claims.
 * Returns warnings for uncited numbers.
 */
export function validateCitations(text: string, citations: Citation[]): string[] {
  const warnings: string[] = [];
  const citationIds = new Set(citations.map(c => c.id));
  
  // Find all numbers in the text (currency, percentages, plain numbers)
  const numberPattern = /\$[\d,.]+[BMKbmk]?|\d+\.?\d*%|\d{1,3}(?:,\d{3})+(?:\.\d+)?/g;
  const matches = text.match(numberPattern) ?? [];
  
  // Check if nearby text contains a citation reference
  for (const match of matches) {
    const idx = text.indexOf(match);
    const surrounding = text.slice(Math.max(0, idx - 100), Math.min(text.length, idx + match.length + 60));
    
    // Check if any citation ID appears near this number
    const hasCitation = Array.from(citationIds).some(id => surrounding.includes(id));
    // Also accept if surrounded by common uncitable patterns (dates, section numbers)
    const isDate = /(?:19|20)\d{2}/.test(match);
    const isSmallNumber = parseFloat(match.replace(/[,$%BMK]/gi, "")) < 2 && !match.includes("$") && !match.includes("%");
    
    if (!hasCitation && !isDate && !isSmallNumber) {
      warnings.push(`Uncited numeric: "${match}" near "...${surrounding.slice(0, 50)}..."`);
    }
  }
  
  return warnings;
}

/**
 * Format confidence label for display
 */
export function confidenceLabel(level: Citation["confidence"]): { text: string; className: string } {
  switch (level) {
    case "high": return { text: "Verified", className: "text-success bg-success/10" };
    case "medium": return { text: "Reported", className: "text-primary bg-primary/10" };
    case "low": return { text: "⚠️ Estimate", className: "text-warning bg-warning/10" };
    case "unverified": return { text: "⚠️ Unverified", className: "text-destructive bg-destructive/10" };
  }
}

// Review state types
export type ReviewState = "draft" | "analyst_reviewed" | "ic_ready";

export const REVIEW_STATES: { key: ReviewState; label: string; description: string }[] = [
  { key: "draft", label: "Draft", description: "AI-generated, pending analyst review" },
  { key: "analyst_reviewed", label: "Analyst Reviewed", description: "Reviewed and verified by analyst" },
  { key: "ic_ready", label: "IC Ready", description: "Approved for Investment Committee" },
];

export function canTransition(from: ReviewState, to: ReviewState): boolean {
  if (from === "draft" && to === "analyst_reviewed") return true;
  if (from === "analyst_reviewed" && to === "ic_ready") return true;
  if (from === "analyst_reviewed" && to === "draft") return true; // reject back
  if (from === "ic_ready" && to === "analyst_reviewed") return true; // revert
  return false;
}
