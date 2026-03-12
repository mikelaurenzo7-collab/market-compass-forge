// ─── Performance Reports ──────────────────────────────────────
//
// Generates weekly/monthly performance reports per bot with
// competitive benchmarking against anonymized federated data.

import crypto from 'crypto';
import type { BotFamily, BotMetrics } from './index';
import type { StrategyBenchmark, PercentileStats } from './federated-learning';
import { rankAgainstBenchmark } from './federated-learning';

// ─── Types ────────────────────────────────────────────────────

export interface PerformanceReportRequest {
  tenantId: string;
  period: 'weekly' | 'monthly';
  /** Unix ms boundaries */
  fromMs: number;
  toMs: number;
}

export interface BotPerformanceSnapshot {
  botId: string;
  botName: string;
  family: BotFamily;
  platform: string;
  strategy: string;
  status: string;

  /** Core metrics for this period */
  metrics: {
    totalTicks: number;
    successfulActions: number;
    failedActions: number;
    deniedActions: number;
    totalPnlUsd: number;
    uptimeMs: number;
    successRate: number;
    errorRate: number;
  };

  /** Period-over-period changes (vs previous period of same length) */
  changes: {
    pnlChange: number;
    successRateChange: number;
    actionVolumeChange: number;
  };

  /** Benchmark ranking (populated if federated data exists) */
  benchmark: BotRanking | null;

  /** Generated insights and recommendations */
  insights: string[];

  /** Health grade: A/B/C/D/F */
  grade: string;
}

export interface BotRanking {
  successRatePercentile: number;
  successRateLabel: string;
  pnlPercentile: number;
  pnlLabel: string;
  errorRatePercentile: number;
  errorRateLabel: string;
  overallPercentile: number;
  overallLabel: string;
  sampleSize: number;
}

export interface PerformanceReport {
  id: string;
  tenantId: string;
  period: 'weekly' | 'monthly';
  generatedAt: number;
  dateRange: { from: string; to: string };

  /** Aggregate stats across all bots */
  aggregate: {
    totalBots: number;
    activeBots: number;
    totalPnlUsd: number;
    avgSuccessRate: number;
    totalActions: number;
    topPerformer: string | null;
    worstPerformer: string | null;
  };

  /** Per-bot snapshots */
  bots: BotPerformanceSnapshot[];

  /** High-level insights */
  highlights: string[];
}

// ─── Report Generator ─────────────────────────────────────────

export function generatePerformanceReport(
  request: PerformanceReportRequest,
  currentMetrics: Array<{
    botId: string;
    botName: string;
    family: BotFamily;
    platform: string;
    strategy: string;
    status: string;
    metrics: BotMetrics;
  }>,
  previousMetrics: Array<{
    botId: string;
    metrics: BotMetrics;
  }>,
  benchmarks: Map<string, StrategyBenchmark>,
): PerformanceReport {
  const botSnapshots: BotPerformanceSnapshot[] = [];

  for (const bot of currentMetrics) {
    const m = bot.metrics;
    const totalActions = m.successfulActions + m.failedActions + m.deniedActions;
    const successRate = totalActions > 0 ? m.successfulActions / totalActions : 0;
    const errorRate = totalActions > 0 ? m.failedActions / totalActions : 0;

    // Find previous period metrics for comparison
    const prev = previousMetrics.find(p => p.botId === bot.botId);
    const prevTotal = prev
      ? prev.metrics.successfulActions + prev.metrics.failedActions + prev.metrics.deniedActions
      : 0;
    const prevSuccessRate = prevTotal > 0 ? prev!.metrics.successfulActions / prevTotal : 0;

    const changes = {
      pnlChange: prev ? m.totalPnlUsd - prev.metrics.totalPnlUsd : 0,
      successRateChange: prev ? successRate - prevSuccessRate : 0,
      actionVolumeChange: prev ? totalActions - prevTotal : 0,
    };

    // Benchmark against federated data
    const benchmarkKey = `${bot.family}:${bot.strategy}`;
    const benchmark = benchmarks.get(benchmarkKey);
    let ranking: BotRanking | null = null;

    if (benchmark) {
      const sr = rankAgainstBenchmark(successRate, benchmark.successRate);
      // Normalize PnL to $/hour rate so it's comparable across different runtimes
      const uptimeHours = Math.max(m.uptimeMs / 3_600_000, 1);
      const pnlRate = (m.totalPnlUsd / uptimeHours) * 100;
      const pnl = rankAgainstBenchmark(pnlRate, benchmark.pnlReturnPercent);
      // For error rate, lower is better — invert the ranking
      const er = rankAgainstBenchmark(1 - errorRate, invertPercentiles(benchmark.errorRate));
      const overallPercentile = Math.round((sr.percentile + pnl.percentile + er.percentile) / 3);

      ranking = {
        successRatePercentile: sr.percentile,
        successRateLabel: sr.label,
        pnlPercentile: pnl.percentile,
        pnlLabel: pnl.label,
        errorRatePercentile: er.percentile,
        errorRateLabel: er.label,
        overallPercentile,
        overallLabel: getOverallLabel(overallPercentile),
        sampleSize: benchmark.sampleSize,
      };
    }

    // Generate insights
    const insights = generateBotInsights(bot.botName, successRate, errorRate, m, changes, ranking);

    // Calculate grade
    const grade = calculateGrade(successRate, errorRate, m.totalPnlUsd, changes);

    botSnapshots.push({
      botId: bot.botId,
      botName: bot.botName,
      family: bot.family,
      platform: bot.platform,
      strategy: bot.strategy,
      status: bot.status,
      metrics: {
        totalTicks: m.totalTicks,
        successfulActions: m.successfulActions,
        failedActions: m.failedActions,
        deniedActions: m.deniedActions,
        totalPnlUsd: Math.round(m.totalPnlUsd * 100) / 100,
        uptimeMs: m.uptimeMs,
        successRate: Math.round(successRate * 1000) / 10,
        errorRate: Math.round(errorRate * 1000) / 10,
      },
      changes,
      benchmark: ranking,
      insights,
      grade,
    });
  }

  // Sort by PnL descending
  botSnapshots.sort((a, b) => b.metrics.totalPnlUsd - a.metrics.totalPnlUsd);

  const activeBots = botSnapshots.filter(b => b.status === 'running').length;
  const totalPnl = botSnapshots.reduce((s, b) => s + b.metrics.totalPnlUsd, 0);
  const totalActions = botSnapshots.reduce((s, b) =>
    s + b.metrics.successfulActions + b.metrics.failedActions + b.metrics.deniedActions, 0);
  const avgSuccessRate = botSnapshots.length > 0
    ? botSnapshots.reduce((s, b) => s + b.metrics.successRate, 0) / botSnapshots.length
    : 0;

  const highlights = generateHighlights(botSnapshots, request.period);

  return {
    id: `pr-${crypto.randomUUID()}`,
    tenantId: request.tenantId,
    period: request.period,
    generatedAt: Date.now(),
    dateRange: {
      from: new Date(request.fromMs).toISOString(),
      to: new Date(request.toMs).toISOString(),
    },
    aggregate: {
      totalBots: botSnapshots.length,
      activeBots,
      totalPnlUsd: Math.round(totalPnl * 100) / 100,
      avgSuccessRate: Math.round(avgSuccessRate * 10) / 10,
      totalActions,
      topPerformer: botSnapshots[0]?.botName ?? null,
      worstPerformer: botSnapshots.length > 1 ? botSnapshots[botSnapshots.length - 1]?.botName ?? null : null,
    },
    bots: botSnapshots,
    highlights,
  };
}

// ─── Insight Generator ────────────────────────────────────────

function generateBotInsights(
  name: string,
  successRate: number,
  errorRate: number,
  metrics: BotMetrics,
  changes: { pnlChange: number; successRateChange: number; actionVolumeChange: number },
  ranking: BotRanking | null,
): string[] {
  const insights: string[] = [];

  if (successRate >= 0.95) {
    insights.push(`${name} is performing exceptionally with a ${(successRate * 100).toFixed(1)}% success rate`);
  } else if (successRate < 0.7) {
    insights.push(`${name} success rate is below 70% — review strategy configuration`);
  }

  if (errorRate > 0.15) {
    insights.push(`High error rate (${(errorRate * 100).toFixed(1)}%) — check platform connectivity and credentials`);
  }

  if (changes.pnlChange > 0) {
    insights.push(`P&L improved by +$${changes.pnlChange.toFixed(2)} vs previous period`);
  } else if (changes.pnlChange < -50) {
    insights.push(`P&L declined by $${Math.abs(changes.pnlChange).toFixed(2)} — consider enabling paper mode`);
  }

  if (changes.successRateChange < -0.1) {
    insights.push(`Success rate dropped ${(Math.abs(changes.successRateChange) * 100).toFixed(1)}% — investigate recent changes`);
  }

  if (ranking) {
    if (ranking.overallPercentile >= 90) {
      insights.push(`Outperforming ${ranking.overallPercentile}% of similar bots across the network`);
    } else if (ranking.overallPercentile < 30) {
      insights.push(`Underperforming vs network average — review strategy parameters`);
    }
  }

  if (metrics.deniedActions > metrics.successfulActions * 0.2) {
    insights.push(`${metrics.deniedActions} actions denied by safety — consider adjusting risk thresholds`);
  }

  return insights;
}

// ─── Grade Calculator ─────────────────────────────────────────

function calculateGrade(
  successRate: number,
  errorRate: number,
  pnl: number,
  changes: { pnlChange: number; successRateChange: number },
): string {
  let score = 0;

  // Success rate (0–40 points)
  score += Math.min(40, successRate * 40);

  // Error rate (0–20 points, lower is better)
  score += Math.max(0, 20 - errorRate * 100);

  // Positive PnL (0–20 points)
  if (pnl > 0) score += Math.min(20, 10 + Math.log10(pnl + 1) * 5);
  else score += Math.max(0, 10 + pnl / 100);

  // Improvement trend (0–20 points)
  if (changes.successRateChange > 0) score += Math.min(10, changes.successRateChange * 100);
  if (changes.pnlChange > 0) score += Math.min(10, Math.log10(changes.pnlChange + 1) * 5);

  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// ─── Highlights Generator ─────────────────────────────────────

function generateHighlights(
  bots: BotPerformanceSnapshot[],
  period: 'weekly' | 'monthly',
): string[] {
  const highlights: string[] = [];
  const periodLabel = period === 'weekly' ? 'This week' : 'This month';

  const totalPnl = bots.reduce((s, b) => s + b.metrics.totalPnlUsd, 0);
  if (totalPnl > 0) {
    highlights.push(`${periodLabel}: +$${totalPnl.toFixed(2)} total P&L across all bots`);
  } else if (totalPnl < 0) {
    highlights.push(`${periodLabel}: -$${Math.abs(totalPnl).toFixed(2)} total P&L — review risk settings`);
  }

  const aGradeBots = bots.filter(b => b.grade === 'A');
  if (aGradeBots.length > 0) {
    highlights.push(`${aGradeBots.length} bot${aGradeBots.length > 1 ? 's' : ''} earned an A grade`);
  }

  const improving = bots.filter(b => b.changes.successRateChange > 0.05);
  if (improving.length > 0) {
    highlights.push(`${improving.length} bot${improving.length > 1 ? 's' : ''} improved success rate by 5%+`);
  }

  const declining = bots.filter(b => b.changes.pnlChange < -100);
  if (declining.length > 0) {
    highlights.push(`${declining.length} bot${declining.length > 1 ? 's' : ''} had >$100 P&L decline — review strategy`);
  }

  const ranked = bots.filter(b => b.benchmark?.overallPercentile && b.benchmark.overallPercentile >= 75);
  if (ranked.length > 0) {
    highlights.push(`${ranked.length} bot${ranked.length > 1 ? 's' : ''} in the top 25% of their strategy class`);
  }

  if (highlights.length === 0) {
    highlights.push(`${periodLabel}: ${bots.length} bot${bots.length !== 1 ? 's' : ''} active, performance within normal range`);
  }

  return highlights;
}

// ─── Helpers ──────────────────────────────────────────────────

function getOverallLabel(percentile: number): string {
  if (percentile >= 90) return 'Elite';
  if (percentile >= 75) return 'Strong';
  if (percentile >= 50) return 'Average';
  if (percentile >= 25) return 'Below Average';
  return 'Needs Improvement';
}

function invertPercentiles(stats: PercentileStats): PercentileStats {
  return {
    p25: 1 - stats.p75,
    p50: 1 - stats.p50,
    p75: 1 - stats.p25,
    p90: 1 - stats.p25 * 0.5, // approximate p10 since we lack it
    mean: 1 - stats.mean,
  };
}

// Note: invertPercentiles p90 is approximate. For accurate inversion,
// the federated benchmark should also carry p10.
