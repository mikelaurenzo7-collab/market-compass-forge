import { Hono } from 'hono';
import { z } from 'zod';
import { verifyAuthHeader } from '../lib/auth.js';
import { getDb } from '../lib/db.js';
import {
  type BotFamily,
  type BotMetrics,
  type PerformanceReport,
  type StrategyBenchmark,
  generatePerformanceReport,
} from '@beastbots/shared';
import { getRuntime } from '@beastbots/workers';

export const performanceRouter = new Hono();

// ─── DB row types ─────────────────────────────────────────────
interface BotRow { id: string; name: string; family: string; platform: string; config: string; status: string; created_at: number }
interface MetricRow { total_ticks: number; successful_actions: number; failed_actions: number; denied_actions: number; total_pnl_usd: number; uptime_ms: number; last_error_message: string | null; last_error_at: number | null; recorded_at: number }
interface ReportRow { id: string; period: string; from_ms: number; to_ms: number; generated_at: number }
interface BenchmarkRow { family: string; strategy: string; sample_size: number; success_rate: string; pnl_return_percent: string; error_rate: string; avg_tick_duration_ms: string; updated_at: number }

// ─── POST /api/performance/generate ────────────────────────────
const generateSchema = z.object({
  period: z.enum(['weekly', 'monthly']),
});

performanceRouter.post('/generate', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues }, 400);

  const now = Date.now();
  const periodMs = parsed.data.period === 'weekly' ? 7 * 86_400_000 : 30 * 86_400_000;
  const fromMs = now - periodMs;
  const prevFromMs = fromMs - periodMs;

  const db = getDb();
  const bots = db.prepare('SELECT id, name, family, platform, config, status, created_at FROM bots WHERE tenant_id = ?').all(auth.tenantId) as BotRow[];

  // Current period metrics per bot
  const currentMetrics = bots.map(bot => {
    const runtime = getRuntime(auth.tenantId, bot.id);
    const liveMetrics = runtime?.getMetrics() ?? null;

    // If running, use live metrics; otherwise use latest persisted snapshot
    let metrics: BotMetrics;
    if (liveMetrics) {
      metrics = liveMetrics;
    } else {
      const row = db.prepare(
        'SELECT total_ticks, successful_actions, failed_actions, denied_actions, total_pnl_usd, uptime_ms, last_error_message, last_error_at, recorded_at FROM bot_metrics WHERE bot_id = ? AND recorded_at >= ? ORDER BY recorded_at DESC LIMIT 1'
      ).get(bot.id, fromMs) as MetricRow | undefined;

      metrics = row ? {
        totalTicks: row.total_ticks,
        successfulActions: row.successful_actions,
        failedActions: row.failed_actions,
        deniedActions: row.denied_actions,
        totalPnlUsd: row.total_pnl_usd,
        uptimeMs: row.uptime_ms,
        lastErrorMessage: row.last_error_message ?? undefined,
        lastErrorAt: row.last_error_at ?? undefined,
      } : {
        totalTicks: 0,
        successfulActions: 0,
        failedActions: 0,
        deniedActions: 0,
        totalPnlUsd: 0,
        uptimeMs: 0,
      };
    }

    const config = JSON.parse(bot.config) as { strategy?: string; strategies?: string[] };
    const strategy = config.strategy ?? config.strategies?.[0] ?? 'unknown';

    return {
      botId: bot.id,
      botName: bot.name,
      family: bot.family as BotFamily,
      platform: bot.platform,
      strategy,
      status: bot.status,
      metrics,
    };
  });

  // Previous period metrics for comparison
  const previousMetrics = bots.map(bot => {
    const row = db.prepare(
      'SELECT total_ticks, successful_actions, failed_actions, denied_actions, total_pnl_usd, uptime_ms, last_error_message, last_error_at FROM bot_metrics WHERE bot_id = ? AND recorded_at >= ? AND recorded_at < ? ORDER BY recorded_at DESC LIMIT 1'
    ).get(bot.id, prevFromMs, fromMs) as MetricRow | undefined;

    return {
      botId: bot.id,
      metrics: row ? {
        totalTicks: row.total_ticks,
        successfulActions: row.successful_actions,
        failedActions: row.failed_actions,
        deniedActions: row.denied_actions,
        totalPnlUsd: row.total_pnl_usd,
        uptimeMs: row.uptime_ms,
        lastErrorMessage: row.last_error_message ?? undefined,
        lastErrorAt: row.last_error_at ?? undefined,
      } : {
        totalTicks: 0,
        successfulActions: 0,
        failedActions: 0,
        deniedActions: 0,
        totalPnlUsd: 0,
        uptimeMs: 0,
      },
    };
  });

  // Load benchmarks
  const benchmarkRows = db.prepare('SELECT * FROM strategy_benchmarks').all() as BenchmarkRow[];
  const benchmarks = new Map<string, StrategyBenchmark>();
  for (const row of benchmarkRows) {
    benchmarks.set(`${row.family}:${row.strategy}`, {
      family: row.family as BotFamily,
      strategy: row.strategy,
      sampleSize: row.sample_size,
      successRate: JSON.parse(row.success_rate),
      pnlReturnPercent: JSON.parse(row.pnl_return_percent),
      errorRate: JSON.parse(row.error_rate),
      avgTickDurationMs: JSON.parse(row.avg_tick_duration_ms),
      updatedAt: row.updated_at,
    });
  }

  const report = generatePerformanceReport(
    { tenantId: auth.tenantId, period: parsed.data.period, fromMs, toMs: now },
    currentMetrics,
    previousMetrics,
    benchmarks,
  );

  // Cache the report
  db.prepare(
    'INSERT INTO performance_reports (id, tenant_id, period, from_ms, to_ms, report, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(report.id, auth.tenantId, report.period, fromMs, now, JSON.stringify(report), report.generatedAt);

  return c.json({ success: true, data: report });
});

// ─── GET /api/performance/reports ──────────────────────────────
performanceRouter.get('/reports', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const rows = db.prepare(
    'SELECT id, period, from_ms, to_ms, generated_at FROM performance_reports WHERE tenant_id = ? ORDER BY generated_at DESC LIMIT 20'
  ).all(auth.tenantId) as ReportRow[];

  return c.json({
    success: true,
    data: rows.map(r => ({
      id: r.id,
      period: r.period,
      fromMs: r.from_ms,
      toMs: r.to_ms,
      generatedAt: r.generated_at,
    })),
  });
});

// ─── GET /api/performance/reports/:id ──────────────────────────
performanceRouter.get('/reports/:id', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const row = db.prepare(
    'SELECT report FROM performance_reports WHERE id = ? AND tenant_id = ?'
  ).get(c.req.param('id'), auth.tenantId) as { report: string } | undefined;

  if (!row) return c.json({ success: false, error: 'Report not found' }, 404);
  return c.json({ success: true, data: JSON.parse(row.report) as PerformanceReport });
});
