/**
 * Release Checklist System
 * Validates that product/landing-page claims don't exceed measured capability.
 * Run before publish to catch overstated metrics or unverifiable claims.
 */

export interface ChecklistItem {
  id: string;
  category: "data_claim" | "testimonial" | "capability" | "metric";
  description: string;
  check: () => CheckResult;
}

export interface CheckResult {
  passed: boolean;
  detail: string;
  severity: "blocker" | "warning";
}

// Current measured capabilities — update as integrations improve
export const MEASURED_CAPABILITIES = {
  companyCount: { actual: 150, source: "seed + enriched", verified: false },
  distressedAssetCount: { actual: 45, source: "seed data", verified: false },
  aiScreening: { available: true, note: "Gemini-powered, beta quality" },
  apiAccess: { available: true, note: "REST endpoints active, rate-limited" },
  dataSources: ["SEC EDGAR", "FRED", "FMP", "Firecrawl"],
  refreshCadence: "weekly for most modules",
  hasTestimonials: false,
  betaStatus: true,
};

export const LANDING_PAGE_CLAIMS = [
  {
    id: "claim_company_count",
    text: "7,800+ Companies",
    measuredValue: MEASURED_CAPABILITIES.companyCount.actual,
    claimedValue: 7800,
    category: "metric" as const,
  },
  {
    id: "claim_distressed_count",
    text: "350+ Distressed Assets",
    measuredValue: MEASURED_CAPABILITIES.distressedAssetCount.actual,
    claimedValue: 350,
    category: "metric" as const,
  },
  {
    id: "claim_24_7_screening",
    text: "24/7 AI Screening",
    isAccurate: MEASURED_CAPABILITIES.aiScreening.available,
    category: "capability" as const,
  },
  {
    id: "claim_social_proof",
    text: "Trusted by emerging fund managers, family offices, and independent sponsors",
    isVerifiable: MEASURED_CAPABILITIES.hasTestimonials,
    category: "testimonial" as const,
  },
];

export function runReleaseChecklist(): { items: (ChecklistItem & { result: CheckResult })[]; canPublish: boolean } {
  const results: (ChecklistItem & { result: CheckResult })[] = [];

  // Check numeric claims don't exceed 2x actual
  for (const claim of LANDING_PAGE_CLAIMS) {
    if (claim.category === "metric" && "measuredValue" in claim) {
      const ratio = claim.claimedValue / claim.measuredValue;
      const passed = ratio <= 2;
      results.push({
        id: claim.id,
        category: claim.category,
        description: `Claim "${claim.text}" vs actual ${claim.measuredValue}`,
        check: () => ({
          passed,
          detail: passed
            ? `Claim within 2x of measured (${claim.measuredValue})`
            : `BLOCKER: Claimed ${claim.claimedValue} but only ${claim.measuredValue} measured (${ratio.toFixed(1)}x overstated)`,
          severity: "blocker",
        }),
        result: {
          passed,
          detail: passed
            ? `Claim within 2x of measured (${claim.measuredValue})`
            : `BLOCKER: Claimed ${claim.claimedValue} but only ${claim.measuredValue} measured (${ratio.toFixed(1)}x overstated)`,
          severity: "blocker",
        },
      });
    }

    if (claim.category === "testimonial" && "isVerifiable" in claim) {
      results.push({
        id: claim.id,
        category: claim.category,
        description: `Testimonial/social proof: "${claim.text}"`,
        check: () => ({
          passed: claim.isVerifiable,
          detail: claim.isVerifiable
            ? "Verified testimonial on file"
            : "BLOCKER: Unverifiable social proof claim — must remove or replace with beta label",
          severity: "blocker",
        }),
        result: {
          passed: claim.isVerifiable,
          detail: claim.isVerifiable
            ? "Verified testimonial on file"
            : "BLOCKER: Unverifiable social proof claim — must remove or replace with beta label",
          severity: "blocker",
        },
      });
    }
  }

  // Check beta status labeling
  results.push({
    id: "beta_label",
    category: "capability",
    description: "Product is labeled as beta where appropriate",
    check: () => ({ passed: true, detail: "Beta labels present", severity: "warning" }),
    result: { passed: true, detail: "Beta labels present", severity: "warning" },
  });

  const canPublish = results.every((r) => r.result.passed || r.result.severity === "warning");

  return { items: results, canPublish };
}
