import { describe, it, expect, beforeEach } from "vitest";
import {
  buildCitationContext,
  validateCitations,
  canTransition,
  resetCitationCounter,
  confidenceLabel,
  type Citation,
} from "@/lib/citationEngine";

describe("Citation Engine", () => {
  beforeEach(() => {
    resetCitationCounter();
  });

  describe("buildCitationContext", () => {
    it("generates citations for all financial fields", () => {
      const ctx = buildCitationContext(
        { employee_count: 500, updated_at: "2026-01-01T00:00:00Z" },
        [{ period: "2025", revenue: 50_000_000, arr: 60_000_000, ebitda: 5_000_000, gross_margin: 0.72, burn_rate: -500_000, confidence_score: "high", fetched_at: "2026-01-15T00:00:00Z", source_type: "sec_filing" }],
        [],
        [],
        [],
      );
      expect(ctx.citations.length).toBeGreaterThanOrEqual(6); // employee + rev + arr + ebitda + margin + burn
      expect(ctx.citations.every(c => c.id && c.metric && c.confidence && c.verifiedAt)).toBe(true);
    });

    it("flags low-confidence metrics", () => {
      const ctx = buildCitationContext(
        {},
        [{ period: "2025", revenue: 10_000_000, confidence_score: "low", created_at: "2026-01-01T00:00:00Z" }],
        [],
        [],
        [],
      );
      expect(ctx.lowConfidenceMetrics.length).toBeGreaterThan(0);
      expect(ctx.lowConfidenceMetrics[0]).toContain("low");
    });

    it("handles missing data gracefully", () => {
      const ctx = buildCitationContext({}, [], [], [], []);
      expect(ctx.citations).toHaveLength(0);
      expect(ctx.lowConfidenceMetrics).toHaveLength(0);
    });

    it("generates funding round citations", () => {
      const ctx = buildCitationContext(
        {},
        [],
        [{ round_type: "Series B", amount: 100_000_000, valuation_post: 500_000_000, date: "2025-06-01", confidence_score: "high", created_at: "2025-06-15T00:00:00Z" }],
        [],
        [],
      );
      expect(ctx.citations.length).toBe(2); // amount + valuation_post
      expect(ctx.citations[0].metric).toContain("Series B");
    });

    it("generates KPI citations with confidence tracking", () => {
      const ctx = buildCitationContext(
        {},
        [],
        [],
        [{ metric_name: "NPS", period: "Q4 2025", value: 72, confidence_score: "unverified", created_at: "2026-01-01T00:00:00Z" }],
        [],
      );
      expect(ctx.citations.length).toBe(1);
      expect(ctx.citations[0].confidence).toBe("unverified");
      expect(ctx.lowConfidenceMetrics.length).toBe(1);
    });
  });

  describe("validateCitations", () => {
    const baseCitations: Citation[] = [
      { id: "cite_1", metric: "Revenue", value: 50000000, formattedValue: "$50M", source: "financials", sourceField: "revenue", confidence: "high", verifiedAt: "2026-01-01T00:00:00Z" },
      { id: "cite_2", metric: "ARR", value: 60000000, formattedValue: "$60M", source: "financials", sourceField: "arr", confidence: "high", verifiedAt: "2026-01-01T00:00:00Z" },
    ];

    it("passes when all numbers have citations", () => {
      const text = "Revenue reached $50M [cite_1] with ARR of $60M [cite_2].";
      const warnings = validateCitations(text, baseCitations);
      expect(warnings).toHaveLength(0);
    });

    it("warns on uncited numeric claims", () => {
      const text = "Revenue is $50M but growth is 150% year-over-year.";
      const warnings = validateCitations(text, baseCitations);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes("150%"))).toBe(true);
    });

    it("allows dates without citations", () => {
      const text = "Founded in 2020, the company [cite_1] reached $50M revenue.";
      const warnings = validateCitations(text, baseCitations);
      // 2020 is a date, should not be flagged
      expect(warnings.every(w => !w.includes("2020"))).toBe(true);
    });

    it("catches large uncited currency values", () => {
      const text = "The company has $200M in total addressable market.";
      const warnings = validateCitations(text, baseCitations);
      expect(warnings.some(w => w.includes("$200M"))).toBe(true);
    });
  });

  describe("confidenceLabel", () => {
    it("returns correct label for each level", () => {
      expect(confidenceLabel("high").text).toBe("Verified");
      expect(confidenceLabel("low").text).toContain("Estimate");
      expect(confidenceLabel("unverified").text).toContain("Unverified");
    });
  });

  describe("Review State Workflow", () => {
    it("allows draft -> analyst_reviewed", () => {
      expect(canTransition("draft", "analyst_reviewed")).toBe(true);
    });

    it("allows analyst_reviewed -> ic_ready", () => {
      expect(canTransition("analyst_reviewed", "ic_ready")).toBe(true);
    });

    it("allows revert ic_ready -> analyst_reviewed", () => {
      expect(canTransition("ic_ready", "analyst_reviewed")).toBe(true);
    });

    it("blocks draft -> ic_ready (skip)", () => {
      expect(canTransition("draft", "ic_ready")).toBe(false);
    });

    it("allows reject analyst_reviewed -> draft", () => {
      expect(canTransition("analyst_reviewed", "draft")).toBe(true);
    });
  });
});
