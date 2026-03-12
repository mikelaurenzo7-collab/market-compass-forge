import { Hono } from 'hono';
import { getDb } from '../lib/db.js';
import { verifyAuthHeader } from '../lib/auth.js';
import { getRuntime } from '@beastbots/workers';

export const analyticsRouter = new Hono();

// ─── DB row types ─────────────────────────────────────────────
interface BotRow { id: string; family: string; platform: string; status: string; name: string; created_at: number }
interface CountRow { cnt: number }
interface AuditActivityRow { source: string; id: string; botId: string | null; platform: string | null; action: string; result: string; riskLevel: string | null; timestamp: number }
interface DecisionActivityRow { source: string; id: string; botId: string; action: string; result: string; durationMs: number; timestamp: number }
interface DecisionRow { action: string; result: string; ts: number; family: string }
interface PnlRow { pnlUsd: number; ts: number; family: string }
interface BotNameRow { id: string; family: string; platform: string; status: string; name: string }
interface BotMetricRow { total_ticks: number; successful_actions: number; failed_actions: number; denied_actions: number; total_pnl_usd: number; uptime_ms: number; recorded_at: number }
interface CurrentBotMetrics {
  totalTicks: number;
  successfulActions: number;
  failedActions: number;
  deniedActions: number;
  totalPnlUsd: number;
  uptimeMs: number;
}
interface FamilySignal {
  label: string;
  value: string;
  hint: string;
  tone: 'positive' | 'neutral' | 'warning';
}
interface FamilyRoiSummary {
  family: string;
  totalBots: number;
  runningBots: number;
  totalTicks: number;
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  deniedActions: number;
  successRate: number;
  totalPnlUsd: number;
  totalUptimeMs: number;
  primarySignal: FamilySignal;
  secondarySignal: FamilySignal;
  tertiarySignal: FamilySignal;
}

const FAMILY_ORDER = ['store', 'trading', 'social', 'workforce'] as const;

function formatCurrency(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded >= 0 ? '+' : '-'}$${Math.abs(rounded).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function getCurrentBotMetrics(tenantId: string, bot: BotNameRow | BotRow, latestMetricsStmt: ReturnType<ReturnType<typeof getDb>['prepare']>): CurrentBotMetrics {
  const runtime = getRuntime(tenantId, bot.id);
  const liveMetrics = runtime?.getMetrics();
  if (liveMetrics) {
    return {
      totalTicks: liveMetrics.totalTicks,
      successfulActions: liveMetrics.successfulActions,
      failedActions: liveMetrics.failedActions,
      deniedActions: liveMetrics.deniedActions,
      totalPnlUsd: liveMetrics.totalPnlUsd,
      uptimeMs: liveMetrics.uptimeMs,
    };
  }

  const histMetrics = latestMetricsStmt.get(bot.id) as BotMetricRow | undefined;
  if (histMetrics) {
    return {
      totalTicks: histMetrics.total_ticks,
      successfulActions: histMetrics.successful_actions,
      failedActions: histMetrics.failed_actions,
      deniedActions: histMetrics.denied_actions,
      totalPnlUsd: histMetrics.total_pnl_usd,
      uptimeMs: histMetrics.uptime_ms,
    };
  }

  return {
    totalTicks: 0,
    successfulActions: 0,
    failedActions: 0,
    deniedActions: 0,
    totalPnlUsd: 0,
    uptimeMs: 0,
  };
}

function buildFamilyRoiSummaries(rows: Array<BotNameRow | BotRow>, metricsByBotId: Map<string, CurrentBotMetrics>) {
  const grouped = new Map<string, FamilyRoiSummary>();

  for (const bot of rows) {
    const metrics = metricsByBotId.get(bot.id) ?? {
      totalTicks: 0,
      successfulActions: 0,
      failedActions: 0,
      deniedActions: 0,
      totalPnlUsd: 0,
      uptimeMs: 0,
    };
    const totalActions = metrics.successfulActions + metrics.failedActions + metrics.deniedActions;

    if (!grouped.has(bot.family)) {
      grouped.set(bot.family, {
        family: bot.family,
        totalBots: 0,
        runningBots: 0,
        totalTicks: 0,
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        deniedActions: 0,
        successRate: 0,
        totalPnlUsd: 0,
        totalUptimeMs: 0,
        primarySignal: { label: '', value: '', hint: '', tone: 'neutral' },
        secondarySignal: { label: '', value: '', hint: '', tone: 'neutral' },
        tertiarySignal: { label: '', value: '', hint: '', tone: 'neutral' },
      });
    }

    const familySummary = grouped.get(bot.family)!;
    familySummary.totalBots += 1;
    if (bot.status === 'running') familySummary.runningBots += 1;
    familySummary.totalTicks += metrics.totalTicks;
    familySummary.totalActions += totalActions;
    familySummary.successfulActions += metrics.successfulActions;
    familySummary.failedActions += metrics.failedActions;
    familySummary.deniedActions += metrics.deniedActions;
    familySummary.totalPnlUsd += metrics.totalPnlUsd;
    familySummary.totalUptimeMs += metrics.uptimeMs;
  }

  for (const summary of grouped.values()) {
    summary.successRate = summary.totalActions > 0
      ? Math.round((summary.successfulActions / summary.totalActions) * 1000) / 10
      : 0;

    if (summary.family === 'trading') {
      summary.primarySignal = {
        label: 'Net P&L',
        value: formatCurrency(summary.totalPnlUsd),
        hint: `${summary.successfulActions} winning actions · ${summary.failedActions} misses`,
        tone: summary.totalPnlUsd >= 0 ? 'positive' : 'warning',
      };
      summary.secondarySignal = {
        label: 'Execution Quality',
        value: formatPercent(summary.successRate),
        hint: `${summary.totalActions.toLocaleString()} total decisions`,
        tone: summary.successRate >= 70 ? 'positive' : 'neutral',
      };
      summary.tertiarySignal = {
        label: 'Safety Interventions',
        value: summary.deniedActions.toLocaleString(),
        hint: 'Risk controls stepped in before execution',
        tone: summary.deniedActions > 0 ? 'warning' : 'positive',
      };
      continue;
    }

    if (summary.family === 'store') {
      summary.primarySignal = {
        label: 'Tracked Value',
        value: formatCurrency(summary.totalPnlUsd),
        hint: 'Observed pricing, inventory, and listing impact',
        tone: summary.totalPnlUsd >= 0 ? 'positive' : 'neutral',
      };
      summary.secondarySignal = {
        label: 'Commerce Ops',
        value: summary.successfulActions.toLocaleString(),
        hint: `${summary.totalTicks.toLocaleString()} monitoring cycles completed`,
        tone: 'positive',
      };
      summary.tertiarySignal = {
        label: 'Price Guards',
        value: summary.deniedActions.toLocaleString(),
        hint: 'Margin and catalog protections triggered',
        tone: summary.deniedActions > 0 ? 'neutral' : 'positive',
      };
      continue;
    }

    if (summary.family === 'social') {
      summary.primarySignal = {
        label: 'Qualified Engagements',
        value: summary.successfulActions.toLocaleString(),
        hint: 'Posts, replies, and optimizations delivered',
        tone: 'positive',
      };
      summary.secondarySignal = {
        label: 'Delivery Quality',
        value: formatPercent(summary.successRate),
        hint: `${summary.totalActions.toLocaleString()} content actions attempted`,
        tone: summary.successRate >= 70 ? 'positive' : 'neutral',
      };
      summary.tertiarySignal = {
        label: 'Content Blocks',
        value: summary.deniedActions.toLocaleString(),
        hint: 'Safety prevented low-trust or risky publishing',
        tone: summary.deniedActions > 0 ? 'warning' : 'positive',
      };
      continue;
    }

    summary.primarySignal = {
      label: 'Tasks Automated',
      value: summary.successfulActions.toLocaleString(),
      hint: 'Routine work completed without manual intervention',
      tone: 'positive',
    };
    summary.secondarySignal = {
      label: 'Completion Quality',
      value: formatPercent(summary.successRate),
      hint: `${summary.totalActions.toLocaleString()} workflows processed`,
      tone: summary.successRate >= 70 ? 'positive' : 'neutral',
    };
    summary.tertiarySignal = {
      label: 'Escalations',
      value: summary.deniedActions.toLocaleString(),
      hint: 'Human review requested by policy or confidence rules',
      tone: summary.deniedActions > 0 ? 'neutral' : 'positive',
    };
  }

  return Array.from(grouped.values()).sort((left, right) => {
    const leftIndex = FAMILY_ORDER.indexOf(left.family as (typeof FAMILY_ORDER)[number]);
    const rightIndex = FAMILY_ORDER.indexOf(right.family as (typeof FAMILY_ORDER)[number]);
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
}

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
  const latestMetricsStmt = db.prepare(
    'SELECT total_ticks, successful_actions, failed_actions, denied_actions, total_pnl_usd, uptime_ms, recorded_at FROM bot_metrics WHERE bot_id = ? ORDER BY recorded_at DESC LIMIT 1'
  );
  const familyCounts: Record<string, { total: number; running: number }> = {};
  const metricsByBotId = new Map<string, CurrentBotMetrics>();
  for (const b of bots) {
    if (!familyCounts[b.family]) familyCounts[b.family] = { total: 0, running: 0 };
    familyCounts[b.family].total++;
    if (b.status === 'running') familyCounts[b.family].running++;

    metricsByBotId.set(b.id, getCurrentBotMetrics(auth.tenantId, b, latestMetricsStmt));
  }

  let totalTicks = 0;
  let successfulActions = 0;
  let failedActions = 0;
  let deniedActions = 0;
  let totalPnlUsd = 0;
  let totalUptimeMs = 0;

  for (const b of bots) {
    const metrics = metricsByBotId.get(b.id);
    if (!metrics) continue;
    totalTicks += metrics.totalTicks;
    successfulActions += metrics.successfulActions;
    failedActions += metrics.failedActions;
    deniedActions += metrics.deniedActions;
    totalPnlUsd += metrics.totalPnlUsd;
    totalUptimeMs += metrics.uptimeMs;
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
      familyRoi: buildFamilyRoiSummaries(bots, metricsByBotId),
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
    SELECT bm.total_pnl_usd AS pnlUsd, bm.recorded_at AS ts, b.family
    FROM bot_metrics bm
    JOIN bots b ON bm.bot_id = b.id
    WHERE b.tenant_id = ? AND bm.recorded_at >= ?
    ORDER BY bm.recorded_at ASC
  `).all(auth.tenantId, sinceMs) as PnlRow[];

  // Also include live running metrics as most recent point
  const bots = db.prepare('SELECT id, family FROM bots WHERE tenant_id = ?').all(auth.tenantId) as { id: string; family: string }[];
  const livePnl: PnlRow[] = [];
  for (const b of bots) {
    const runtime = getRuntime(auth.tenantId, b.id);
    if (runtime) {
      const m = runtime.getMetrics();
      if (m) livePnl.push({ pnlUsd: m.totalPnlUsd, ts: now, family: b.family });
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
  const latestMetricsStmt = db.prepare(
    'SELECT total_ticks, successful_actions, failed_actions, denied_actions, total_pnl_usd, uptime_ms, recorded_at FROM bot_metrics WHERE bot_id = ? ORDER BY recorded_at DESC LIMIT 1'
  );

  const perBot = bots.map((b) => {
    const metrics = getCurrentBotMetrics(auth.tenantId, b, latestMetricsStmt);

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
