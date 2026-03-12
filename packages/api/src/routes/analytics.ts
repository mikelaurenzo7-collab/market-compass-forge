import { Hono } from 'hono';
import { getDb } from '../lib/db.js';
import { verifyAuthHeader } from '../lib/auth.js';
import { getRuntime } from '@beastbots/workers';

export const analyticsRouter = new Hono();

// ─── DB row types ─────────────────────────────────────────────
interface BotRow { id: string; family: string; platform: string; status: string; name: string; created_at: number }
interface AggMetricsRow { totalTicks: number | null; successfulActions: number | null; failedActions: number | null; deniedActions: number | null; totalPnlUsd: number | null; uptimeMs: number | null }
interface CountRow { cnt: number }
interface AuditActivityRow { source: string; id: string; botId: string | null; platform: string | null; action: string; result: string; riskLevel: string | null; timestamp: number }
interface DecisionActivityRow { source: string; id: string; botId: string; action: string; result: string; durationMs: number; timestamp: number }
interface DecisionRow { action: string; result: string; ts: number; family: string }
interface PnlRow { pnl: number; ts: number; family: string }
interface BotNameRow { id: string; family: string; platform: string; status: string; name: string }
interface BotMetricRow { total_ticks: number; successful_actions: number; failed_actions: number; denied_actions: number; total_pnl_usd: number; uptime_ms: number; recorded_at: number }

// ─── GET /api/analytics/summary ────────────────────────────────
// Aggregated stats across all of a tenant's bots — used by dashboard + analytics page
analyticsRouter.get('/summary', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();

  // All bots for this tenant
  const bots = db.prepare(
    'SELECT id, family, platform, status, name, created_at FROM bots WHERE tenant_id = ? ORDER BY created_at DESC'
  ).all(auth.tenantId) as BotRow[];
  const familyCounts: Record<string, { total: number; running: number }> = {};
  for (const b of bots) {
    if (!familyCounts[b.family]) familyCounts[b.family] = { total: 0, running: 0 };
    familyCounts[b.family].total++;
    if (b.status === 'running') familyCounts[b.family].running++;
  }

  // Live metrics from running bots
  let totalTicks = 0;
  let successfulActions = 0;
  let failedActions = 0;
  let deniedActions = 0;
  let totalPnlUsd = 0;
  let totalUptimeMs = 0;

  for (const b of bots) {
    const runtime = getRuntime(auth.tenantId, b.id);
    if (runtime) {
      const m = runtime.getMetrics();
      if (m) {
        totalTicks += m.totalTicks;
        successfulActions += m.successfulActions;
        failedActions += m.failedActions;
        deniedActions += m.deniedActions;
        totalPnlUsd += m.totalPnlUsd;
        totalUptimeMs += m.uptimeMs;
      }
    }
  }

  // Also aggregate from persisted bot_metrics (historical)
  const histMetrics = db.prepare(`
    SELECT SUM(total_ticks) AS totalTicks, SUM(successful_actions) AS successfulActions,
           SUM(failed_actions) AS failedActions, SUM(denied_actions) AS deniedActions,
           SUM(total_pnl_usd) AS totalPnlUsd, SUM(uptime_ms) AS uptimeMs
    FROM bot_metrics WHERE bot_id IN (SELECT id FROM bots WHERE tenant_id = ?)
  `).get(auth.tenantId) as AggMetricsRow | undefined;

  if (histMetrics?.totalTicks) {
    totalTicks += histMetrics.totalTicks;
    successfulActions += histMetrics.successfulActions ?? 0;
    failedActions += histMetrics.failedActions ?? 0;
    deniedActions += histMetrics.deniedActions ?? 0;
    totalPnlUsd += histMetrics.totalPnlUsd ?? 0;
    totalUptimeMs += histMetrics.uptimeMs ?? 0;
  }

  const totalActions = successfulActions + failedActions + deniedActions;
  const successRate = totalActions > 0 ? Math.round((successfulActions / totalActions) * 1000) / 10 : 0;

  // Connected platforms count
  const credCount = db.prepare(
    'SELECT COUNT(*) AS cnt FROM credentials WHERE tenant_id = ?'
  ).get(auth.tenantId) as CountRow | undefined;

  return c.json({
    success: true,
    data: {
      bots: {
        total: bots.length,
        running: bots.filter((b) => b.status === 'running').length,
        byFamily: familyCounts,
      },
      metrics: {
        totalTicks,
        successfulActions,
        failedActions,
        deniedActions,
        totalPnlUsd: Math.round(totalPnlUsd * 100) / 100,
        totalUptimeMs,
        successRate,
        totalActions,
      },
      connectedPlatforms: credCount?.cnt ?? 0,
    },
  });
});

// ─── GET /api/analytics/activity ───────────────────────────────
// Recent activity feed — from audit_log + decision_log
analyticsRouter.get('/activity', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const limit = Math.min(Number(c.req.query('limit') ?? '30'), 100);
  const db = getDb();

  // Combine audit_log and decision_log into a unified feed
  const auditRows = db.prepare(`
    SELECT 'audit' AS source, id, bot_id AS botId, platform, action, result, risk_level AS riskLevel, created_at AS timestamp
    FROM audit_log WHERE tenant_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(auth.tenantId, limit) as AuditActivityRow[];

  const decisionRows = db.prepare(`
    SELECT 'decision' AS source, CAST(id AS TEXT) AS id, bot_id AS botId, action, result, duration_ms AS durationMs, created_at AS timestamp
    FROM decision_log WHERE tenant_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(auth.tenantId, limit) as DecisionActivityRow[];

  // Merge and sort by timestamp desc
  const merged = [...auditRows, ...decisionRows]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);

  return c.json({ success: true, data: merged });
});

// ─── GET /api/analytics/timeseries ─────────────────────────────
// Time-series data for charts — from bot_metrics + decision_log
analyticsRouter.get('/timeseries', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const period = c.req.query('period') ?? '24h';
  const now = Date.now();

  let sinceMs: number;
  let bucketMs: number;
  switch (period) {
    case '7d':
      sinceMs = now - 7 * 86_400_000;
      bucketMs = 3_600_000; // 1 hour buckets
      break;
    case '30d':
      sinceMs = now - 30 * 86_400_000;
      bucketMs = 86_400_000; // 1 day buckets
      break;
    case '90d':
      sinceMs = now - 90 * 86_400_000;
      bucketMs = 86_400_000;
      break;
    default: // 24h
      sinceMs = now - 86_400_000;
      bucketMs = 3_600_000;
      break;
  }

  const db = getDb();

  // Decision log aggregation — actions per bucket, split by family
  const decisions = db.prepare(`
    SELECT d.action, d.result, d.created_at AS ts, b.family
    FROM decision_log d
    JOIN bots b ON d.bot_id = b.id
    WHERE d.tenant_id = ? AND d.created_at >= ?
    ORDER BY d.created_at ASC
  `).all(auth.tenantId, sinceMs) as DecisionRow[];

  // Build bucketed time-series
  const buckets: Record<number, { ts: number; trading: number; store: number; social: number; workforce: number; success: number; fail: number }> = {};
  for (const d of decisions) {
    const bucketKey = Math.floor(d.ts / bucketMs) * bucketMs;
    if (!buckets[bucketKey]) {
      buckets[bucketKey] = { ts: bucketKey, trading: 0, store: 0, social: 0, workforce: 0, success: 0, fail: 0 };
    }
    const bucket = buckets[bucketKey];
    if (d.family === 'trading' || d.family === 'store' || d.family === 'social' || d.family === 'workforce') bucket[d.family]++;
    if (d.result === 'executed' || d.result === 'allowed') bucket.success++;
    else bucket.fail++;
  }

  // Fill empty buckets
  const timeseriesData = [];
  for (let t = Math.floor(sinceMs / bucketMs) * bucketMs; t <= now; t += bucketMs) {
    timeseriesData.push(buckets[t] ?? { ts: t, trading: 0, store: 0, social: 0, workforce: 0, success: 0, fail: 0 });
  }

  // Cumulative P&L from bot_metrics snapshots
  const pnlSnapshots = db.prepare(`
    SELECT bm.total_pnl_usd AS pnl, bm.recorded_at AS ts, b.family
    FROM bot_metrics bm
    JOIN bots b ON bm.bot_id = b.id
    WHERE b.tenant_id = ? AND bm.recorded_at >= ?
    ORDER BY bm.recorded_at ASC
  `).all(auth.tenantId, sinceMs) as PnlRow[];

  // Also include live running metrics as most recent point
  const bots = db.prepare('SELECT id, family FROM bots WHERE tenant_id = ?').all(auth.tenantId) as { id: string; family: string }[];
  const livePnl: { pnl: number; ts: number; family: string }[] = [];
  for (const b of bots) {
    const runtime = getRuntime(auth.tenantId, b.id);
    if (runtime) {
      const m = runtime.getMetrics();
      if (m) livePnl.push({ pnl: m.totalPnlUsd, ts: now, family: b.family });
    }
  }

  return c.json({
    success: true,
    data: {
      period,
      activity: timeseriesData,
      pnlSnapshots: [...pnlSnapshots, ...livePnl],
    },
  });
});

// ─── GET /api/analytics/per-bot ────────────────────────────────
// Per-bot metrics for the detail view
analyticsRouter.get('/per-bot', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();
  const bots = db.prepare(
    'SELECT id, family, platform, status, name FROM bots WHERE tenant_id = ?'
  ).all(auth.tenantId) as BotNameRow[];

  const perBot = bots.map((b) => {
    // Live metrics from runtime
    const runtime = getRuntime(auth.tenantId, b.id);
    const liveMetrics = runtime?.getMetrics() ?? null;

    // Historical metrics (latest snapshot)
    const histMetrics = db.prepare(
      'SELECT total_ticks, successful_actions, failed_actions, denied_actions, total_pnl_usd, uptime_ms, recorded_at FROM bot_metrics WHERE bot_id = ? ORDER BY recorded_at DESC LIMIT 1'
    ).get(b.id) as BotMetricRow | undefined;

    const metrics = liveMetrics ?? (histMetrics ? {
      totalTicks: histMetrics.total_ticks,
      successfulActions: histMetrics.successful_actions,
      failedActions: histMetrics.failed_actions,
      deniedActions: histMetrics.denied_actions,
      totalPnlUsd: histMetrics.total_pnl_usd,
      uptimeMs: histMetrics.uptime_ms,
    } : null);

    return {
      id: b.id,
      name: b.name,
      family: b.family,
      platform: b.platform,
      status: b.status,
      metrics,
    };
  });

  return c.json({ success: true, data: perBot });
});
