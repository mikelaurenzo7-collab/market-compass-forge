// ─── Federated Learning System ────────────────────────────────
//
// Opt-in anonymized performance sharing across tenants.
// No raw PII or strategy configs leave the tenant boundary.
// Only aggregate statistical snapshots are contributed.

import crypto from 'crypto';
import type { BotFamily, BotMetrics } from './index.js';

// ─── Types ────────────────────────────────────────────────────

/** An anonymized performance snapshot contributed by a tenant. */
export interface FederatedContribution {
  /** Random contribution ID (not linked to tenant) */
  id: string;
  family: BotFamily;
  /** Strategy type, e.g. 'momentum', 'dynamic_pricing' */
  strategy: string;
  /** Time window this snapshot covers, in ms */
  windowMs: number;
  /** Snapshot metrics (all anonymized — no tenant/bot IDs) */
  metrics: {
    successRate: number;     // 0–1
    totalActions: number;
    avgTickDurationMs: number;
    pnlReturnPercent: number; // relative, not absolute $
    errorRate: number;       // 0–1
    circuitBreakerTrips: number;
    safetyDenials: number;
  };
  /** Bucketed position ranges for k-anonymity */
  botAgeDays: number;  // rounded to nearest 7
  contributedAt: number;
}

/** Aggregated benchmark for a family+strategy combination. */
export interface StrategyBenchmark {
  family: BotFamily;
  strategy: string;
  /** Number of contributions in this benchmark */
  sampleSize: number;
  /** Percentile breakpoints */
  successRate: PercentileStats;
  pnlReturnPercent: PercentileStats;
  errorRate: PercentileStats;
  avgTickDurationMs: PercentileStats;
  /** Unix ms of last recalculation */
  updatedAt: number;
}

export interface PercentileStats {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  mean: number;
}

/** A tenant's opt-in status and contribution history. */
export interface FederatedLearningConfig {
  enabled: boolean;
  /** How often to contribute (ms). Default: 24 hours */
  contributionIntervalMs: number;
  /** Last contribution timestamp */
  lastContributedAt: number;
  /** Total contributions made */
  totalContributions: number;
}

// ─── Defaults ─────────────────────────────────────────────────

export function createDefaultFederatedConfig(): FederatedLearningConfig {
  return {
    enabled: false,
    contributionIntervalMs: 24 * 60 * 60 * 1000, // 24h
    lastContributedAt: 0,
    totalContributions: 0,
  };
}

// ─── Contribution Builder ─────────────────────────────────────

/**
 * Builds an anonymized contribution from bot metrics.
 * Strips all identifying information: no tenant ID, no bot ID, no dollar amounts.
 * Returns null if there's insufficient data (< 100 ticks).
 */
export function buildContribution(
  family: BotFamily,
  strategy: string,
  metrics: BotMetrics,
  botCreatedAt: number,
  windowMs: number,
): FederatedContribution | null {
  if (metrics.totalTicks < 100) return null; // k-anonymity: need minimum activity

  const totalActions = metrics.successfulActions + metrics.failedActions + metrics.deniedActions;
  if (totalActions === 0) return null;

  const successRate = metrics.successfulActions / totalActions;
  const errorRate = metrics.failedActions / totalActions;

  // Anonymize bot age to nearest week
  const ageMs = Date.now() - botCreatedAt;
  const ageDays = Math.round(ageMs / (7 * 86_400_000)) * 7;

  // PnL rate: dollars per hour of uptime, scaled to standardized unit.
  // This is a velocity metric ($/hr * 100), not a capital return %.
  // All bots use the same unit, so benchmarks are comparable.
  const uptimeHours = Math.max(metrics.uptimeMs / 3_600_000, 1);
  const pnlReturnPercent = (metrics.totalPnlUsd / uptimeHours) * 100;

  const avgTickDurationMs = metrics.uptimeMs / Math.max(metrics.totalTicks, 1);

  return {
    id: `fc-${crypto.randomUUID()}`,
    family,
    strategy,
    windowMs,
    metrics: {
      successRate: round4(successRate),
      totalActions,
      avgTickDurationMs: Math.round(avgTickDurationMs),
      pnlReturnPercent: round4(pnlReturnPercent),
      errorRate: round4(errorRate),
      circuitBreakerTrips: 0, // populated by caller if available
      safetyDenials: metrics.deniedActions,
    },
    botAgeDays: ageDays,
    contributedAt: Date.now(),
  };
}

// ─── Benchmark Aggregation ────────────────────────────────────

/**
 * Aggregates an array of contributions into a benchmark.
 * Requires at least 5 contributions for statistical validity.
 */
export function aggregateBenchmark(
  family: BotFamily,
  strategy: string,
  contributions: FederatedContribution[],
): StrategyBenchmark | null {
  if (contributions.length < 5) return null;

  const successRates = contributions.map(c => c.metrics.successRate).sort((a, b) => a - b);
  const pnlReturns = contributions.map(c => c.metrics.pnlReturnPercent).sort((a, b) => a - b);
  const errorRates = contributions.map(c => c.metrics.errorRate).sort((a, b) => a - b);
  const tickDurations = contributions.map(c => c.metrics.avgTickDurationMs).sort((a, b) => a - b);

  return {
    family,
    strategy,
    sampleSize: contributions.length,
    successRate: calcPercentiles(successRates),
    pnlReturnPercent: calcPercentiles(pnlReturns),
    errorRate: calcPercentiles(errorRates),
    avgTickDurationMs: calcPercentiles(tickDurations),
    updatedAt: Date.now(),
  };
}

/**
 * Compares a bot's metrics against a benchmark and returns a percentile rank.
 * Returns null if no benchmark exists.
 */
export function rankAgainstBenchmark(
  metric: number,
  benchmark: PercentileStats,
): { percentile: number; label: string } {
  let percentile: number;
  if (metric <= benchmark.p25) percentile = 25 * (metric / Math.max(benchmark.p25, 0.001));
  else if (metric <= benchmark.p50) percentile = 25 + 25 * ((metric - benchmark.p25) / Math.max(benchmark.p50 - benchmark.p25, 0.001));
  else if (metric <= benchmark.p75) percentile = 50 + 25 * ((metric - benchmark.p50) / Math.max(benchmark.p75 - benchmark.p50, 0.001));
  else if (metric <= benchmark.p90) percentile = 75 + 15 * ((metric - benchmark.p75) / Math.max(benchmark.p90 - benchmark.p75, 0.001));
  else percentile = 90 + 10 * Math.min(1, (metric - benchmark.p90) / Math.max(benchmark.p90, 0.001));

  percentile = Math.min(100, Math.max(0, Math.round(percentile)));

  let label: string;
  if (percentile >= 90) label = 'Elite';
  else if (percentile >= 75) label = 'Strong';
  else if (percentile >= 50) label = 'Average';
  else if (percentile >= 25) label = 'Below Average';
  else label = 'Needs Improvement';

  return { percentile, label };
}

// ─── Helpers ──────────────────────────────────────────────────

function calcPercentiles(sorted: number[]): PercentileStats {
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  return {
    p25: round4(sorted[Math.floor(n * 0.25)] ?? 0),
    p50: round4(sorted[Math.floor(n * 0.50)] ?? 0),
    p75: round4(sorted[Math.floor(n * 0.75)] ?? 0),
    p90: round4(sorted[Math.floor(n * 0.90)] ?? 0),
    mean: round4(mean),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
