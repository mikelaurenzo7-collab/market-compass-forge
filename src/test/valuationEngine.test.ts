import { describe, it, expect } from "vitest";
import {
  computeValuationScore,
  percentileRank,
  getGrade,
  MODEL_VERSION,
  WEIGHTS,
  CompanyInputs,
  SectorBenchmarks,
} from "@/lib/valuationEngine";

// ─── Helpers ────────────────────────────────────────────────────────────────

const baseInputs: CompanyInputs = {
  sector: "Enterprise SaaS",
  stage: "Series B",
  employeeCount: 150,
  arr: 25_000_000,
  revenue: 25_000_000,
  ebitda: 2_000_000,
  valuation: 250_000_000,
  grossMargin: 0.78,
  burnRate: -500_000,
  runwayMonths: 24,
  previousArr: 18_000_000,
  historicals: [
    { period: "2023", arr: 15_000_000, revenue: 15_000_000 },
    { period: "2024", arr: 20_000_000, revenue: 20_000_000 },
    { period: "2025", arr: 25_000_000, revenue: 25_000_000 },
  ],
};

const peerDistribution = [
  1_000_000, 3_000_000, 5_000_000, 8_000_000, 12_000_000,
  18_000_000, 25_000_000, 40_000_000, 60_000_000, 100_000_000,
].sort((a, b) => a - b);

const sectorBenchmarks: SectorBenchmarks = {
  evRevenueMedian: 12.0,
  evEbitdaMedian: 25.0,
  dealCount12m: 8,
  fundingCount12m: 15,
  evRevenueCount: 10,
};

// ─── Utility Tests ──────────────────────────────────────────────────────────

describe("Utility Functions", () => {
  it("percentileRank returns 0 for empty array", () => {
    expect(percentileRank([], 100)).toBe(0);
  });

  it("percentileRank returns 0 for non-positive value", () => {
    expect(percentileRank([1, 2, 3], 0)).toBe(0);
    expect(percentileRank([1, 2, 3], -5)).toBe(0);
  });

  it("percentileRank gives correct rank", () => {
    const sorted = [10, 20, 30, 40, 50];
    expect(percentileRank(sorted, 30)).toBe(60); // 3/5
    expect(percentileRank(sorted, 50)).toBe(100);
    expect(percentileRank(sorted, 5)).toBe(0);
  });

  it("getGrade maps correctly", () => {
    expect(getGrade(95).grade).toBe("A+");
    expect(getGrade(80).grade).toBe("A");
    expect(getGrade(55).grade).toBe("B");
    expect(getGrade(40).grade).toBe("C+");
    expect(getGrade(10).grade).toBe("F");
    expect(getGrade(0).grade).toBe("F");
  });
});

// ─── Core Scoring Tests ─────────────────────────────────────────────────────

describe("computeValuationScore", () => {
  it("produces deterministic output for identical inputs", () => {
    const r1 = computeValuationScore(baseInputs, peerDistribution, sectorBenchmarks);
    const r2 = computeValuationScore(baseInputs, peerDistribution, sectorBenchmarks);
    expect(r1.overall).toBe(r2.overall);
    expect(r1.grade).toBe(r2.grade);
    expect(r1.arrScore).toBe(r2.arrScore);
    expect(r1.valuationScore).toBe(r2.valuationScore);
  });

  it("returns model version in explainability", () => {
    const r = computeValuationScore(baseInputs, peerDistribution, sectorBenchmarks);
    expect(r.explainability.modelVersion).toBe(MODEL_VERSION);
  });

  it("returns all 6 factor contributions", () => {
    const r = computeValuationScore(baseInputs, peerDistribution, sectorBenchmarks);
    expect(r.explainability.factors).toHaveLength(6);
    const names = r.explainability.factors.map((f) => f.factor);
    expect(names).toContain("ARR / Revenue Scale");
    expect(names).toContain("Valuation (Sector-Adj)");
    expect(names).toContain("Growth Trajectory");
    expect(names).toContain("Sector Momentum");
    expect(names).toContain("Operational Efficiency");
    expect(names).toContain("Capital Efficiency");
  });

  it("weighted contributions sum to overall score", () => {
    const r = computeValuationScore(baseInputs, peerDistribution, sectorBenchmarks);
    const sumContributions = r.explainability.factors.reduce((s, f) => s + f.weightedContribution, 0);
    // Allow rounding tolerance of 1
    expect(Math.abs(sumContributions - r.overall)).toBeLessThanOrEqual(1);
  });

  it("weights match config", () => {
    const r = computeValuationScore(baseInputs, peerDistribution, sectorBenchmarks);
    expect(r.explainability.weights).toEqual(WEIGHTS);
  });

  it("overall is between 0 and 100", () => {
    const r = computeValuationScore(baseInputs, peerDistribution, sectorBenchmarks);
    expect(r.overall).toBeGreaterThanOrEqual(0);
    expect(r.overall).toBeLessThanOrEqual(100);
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe("Edge Cases", () => {
  it("handles missing ARR gracefully", () => {
    const noArr: CompanyInputs = {
      ...baseInputs,
      arr: 0,
      revenue: 0,
      previousArr: 0,
      historicals: [],
    };
    const r = computeValuationScore(noArr, peerDistribution, sectorBenchmarks);
    expect(r.arrScore).toBe(0);
    expect(r.explainability.inputQualityFlags).toContain("No ARR or revenue data — scale score defaults to 0");
    expect(r.overall).toBeGreaterThanOrEqual(0);
  });

  it("handles missing ARR but present revenue", () => {
    const revenueOnly: CompanyInputs = {
      ...baseInputs,
      arr: 0,
      revenue: 20_000_000,
    };
    const r = computeValuationScore(revenueOnly, peerDistribution, sectorBenchmarks);
    expect(r.arrScore).toBeGreaterThan(0);
    expect(r.explainability.inputQualityFlags).toContain("ARR missing — using revenue as proxy");
  });

  it("handles outlier valuation (extremely high)", () => {
    const outlier: CompanyInputs = {
      ...baseInputs,
      valuation: 5_000_000_000, // 200x revenue
    };
    const r = computeValuationScore(outlier, peerDistribution, sectorBenchmarks);
    expect(r.valuationScore).toBeLessThan(30); // Should be penalized
    expect(r.impliedMultiple).toBeGreaterThan(100);
  });

  it("handles outlier valuation (extremely low / deep value)", () => {
    const deepValue: CompanyInputs = {
      ...baseInputs,
      valuation: 50_000_000, // 2x revenue
    };
    const r = computeValuationScore(deepValue, peerDistribution, sectorBenchmarks);
    expect(r.valuationScore).toBeGreaterThan(85);
  });

  it("handles no valuation data", () => {
    const noVal: CompanyInputs = { ...baseInputs, valuation: 0 };
    const r = computeValuationScore(noVal, peerDistribution, sectorBenchmarks);
    expect(r.valuationScore).toBe(50); // Default
    expect(r.explainability.inputQualityFlags).toContain("No valuation data — valuation score defaults to 50");
    expect(r.explainability.confidenceAdjustments).toContain("Valuation unknown — 22% of score weight is at default (50)");
  });

  it("handles low-confidence inputs (many missing fields)", () => {
    const sparse: CompanyInputs = {
      sector: null,
      stage: null,
      employeeCount: null,
      arr: 0,
      revenue: 0,
      ebitda: 0,
      valuation: 0,
      grossMargin: 0,
      burnRate: 0,
      runwayMonths: 0,
      previousArr: 0,
      historicals: [],
    };
    const r = computeValuationScore(sparse, [], null);
    expect(r.explainability.inputQualityFlags.length).toBeGreaterThanOrEqual(3);
    expect(r.explainability.confidenceAdjustments).toContain("Multiple input gaps detected — overall score confidence is reduced");
  });

  it("handles no sector benchmarks (absolute fallback)", () => {
    const r = computeValuationScore(baseInputs, peerDistribution, null);
    expect(r.explainability.inputQualityFlags).toContain("No sector benchmark data — valuation scored on absolute thresholds");
    expect(r.overall).toBeGreaterThanOrEqual(0);
  });

  it("handles negative growth (declining revenue)", () => {
    const declining: CompanyInputs = {
      ...baseInputs,
      arr: 15_000_000,
      previousArr: 25_000_000,
      historicals: [
        { period: "2024", arr: 25_000_000, revenue: 25_000_000 },
        { period: "2025", arr: 15_000_000, revenue: 15_000_000 },
      ],
    };
    const r = computeValuationScore(declining, peerDistribution, sectorBenchmarks);
    expect(r.growthScore).toBeLessThan(20);
    expect(r.insights).toContain("Revenue declining");
  });

  it("flags low runway with reduced capital efficiency", () => {
    const lowRunway: CompanyInputs = { ...baseInputs, runwayMonths: 6 };
    const r = computeValuationScore(lowRunway, peerDistribution, sectorBenchmarks);
    const normalRunway = computeValuationScore(baseInputs, peerDistribution, sectorBenchmarks);
    expect(r.capitalEfficiency).toBeLessThan(normalRunway.capitalEfficiency);
  });

  it("rewards cash flow positive companies", () => {
    const profitable: CompanyInputs = { ...baseInputs, burnRate: 1_000_000, runwayMonths: 0 };
    const r = computeValuationScore(profitable, peerDistribution, sectorBenchmarks);
    expect(r.capitalEfficiency).toBeGreaterThanOrEqual(90);
    expect(r.insights).toContain("Cash flow positive");
  });
});
