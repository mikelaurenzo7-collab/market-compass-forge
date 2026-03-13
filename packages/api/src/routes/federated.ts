import { Hono } from 'hono';
import { z } from 'zod';
import { verifyAuthHeader } from '../lib/auth.js';
import { getDb } from '../lib/db.js';
import {
  type FederatedLearningConfig,
  type FederatedContribution,
  type StrategyBenchmark,
  createDefaultFederatedConfig,
  buildContribution,
  aggregateBenchmark,
} from '@beastbots/shared';
import { getRuntimeMetricsSnapshot } from '../lib/runtime-snapshot.js';

export const federatedRouter = new Hono();

// ─── DB row types ─────────────────────────────────────────────
interface FLConfigRow { tenant_id: string; enabled: number; contribution_interval_ms: number; last_contributed_at: number; total_contributions: number }
interface ContribRow { id: string; family: string; strategy: string; window_ms: number; metrics: string; bot_age_days: number; contributed_at: number }
interface BenchmarkRow { family: string; strategy: string; sample_size: number; success_rate: string; pnl_return_percent: string; error_rate: string; avg_tick_duration_ms: string; updated_at: number }
interface BotRow { id: string; family: string; platform: string; config: string; created_at: number }

function toConfig(row: FLConfigRow | undefined): FederatedLearningConfig {
  if (!row) return createDefaultFederatedConfig();
  return {
    enabled: row.enabled === 1,
    contributionIntervalMs: row.contribution_interval_ms,
    lastContributedAt: row.last_contributed_at,
    totalContributions: row.total_contributions,
  };
}

function upsertConfig(tenantId: string, enabled: boolean, contributionIntervalMs?: number): FederatedLearningConfig {
  const db = getDb();
  const interval = contributionIntervalMs ?? 86_400_000;
  const now = Date.now();
  db.prepare(`
    INSERT INTO federated_learning_config (tenant_id, enabled, contribution_interval_ms, last_contributed_at, total_contributions, updated_at)
    VALUES (?, ?, ?, 0, 0, ?)
    ON CONFLICT(tenant_id) DO UPDATE SET enabled = ?, contribution_interval_ms = ?, updated_at = ?
  `).run(tenantId, enabled ? 1 : 0, interval, now, enabled ? 1 : 0, interval, now);

  const updated = db.prepare('SELECT * FROM federated_learning_config WHERE tenant_id = ?').get(tenantId) as FLConfigRow | undefined;
  return toConfig(updated);
}

// ─── GET /api/federated/config ─────────────────────────────────
federatedRouter.get('/config', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const row = db.prepare('SELECT * FROM federated_learning_config WHERE tenant_id = ?').get(auth.tenantId) as FLConfigRow | undefined;

  return c.json({ success: true, data: toConfig(row) });
});

// ─── PUT /api/federated/config ─────────────────────────────────
const configSchema = z.object({
  enabled: z.boolean(),
  contributionIntervalMs: z.number().min(3_600_000).max(604_800_000).optional(), // 1h–7d
});

federatedRouter.put('/config', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues }, 400);

  const updatedConfig = upsertConfig(auth.tenantId, parsed.data.enabled, parsed.data.contributionIntervalMs);
  return c.json({ success: true, data: updatedConfig });
});

// ─── Compatibility aliases for existing web + SDK clients ─────

// GET /api/federated/status
federatedRouter.get('/status', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const row = db.prepare('SELECT * FROM federated_learning_config WHERE tenant_id = ?').get(auth.tenantId) as FLConfigRow | undefined;
  return c.json({ success: true, data: toConfig(row) });
});

const optInSchema = z.object({
  enabled: z.boolean(),
});

// POST /api/federated/opt-in
federatedRouter.post('/opt-in', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = optInSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues }, 400);

  const updatedConfig = upsertConfig(auth.tenantId, parsed.data.enabled);
  return c.json({ success: true, data: updatedConfig });
});

// ─── POST /api/federated/contribute ────────────────────────────
// Collects anonymized metrics from all running bots and contributes them
federatedRouter.post('/contribute', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const configRow = db.prepare('SELECT * FROM federated_learning_config WHERE tenant_id = ?').get(auth.tenantId) as FLConfigRow | undefined;
  if (!configRow || configRow.enabled !== 1) {
    return c.json({ success: false, error: 'Federated learning not enabled' }, 400);
  }

  // Check contribution interval
  const now = Date.now();
  if (now - configRow.last_contributed_at < configRow.contribution_interval_ms) {
    return c.json({ success: false, error: 'Contribution interval not elapsed' }, 429);
  }

  const bots = db.prepare('SELECT id, family, platform, config, created_at FROM bots WHERE tenant_id = ?').all(auth.tenantId) as BotRow[];
  const contributions: FederatedContribution[] = [];

  for (const bot of bots) {
    const metrics = (await getRuntimeMetricsSnapshot(auth.tenantId, bot.id)).metrics;
    if (!metrics) continue;

    const config = JSON.parse(bot.config) as { strategy?: string };
    const strategy = config.strategy ?? 'unknown';
    const contribution = buildContribution(
      bot.family as 'trading' | 'store' | 'social' | 'workforce',
      strategy,
      metrics,
      bot.created_at,
      configRow.contribution_interval_ms,
    );
    if (contribution) contributions.push(contribution);
  }

  // Store contributions (anonymized — no tenant ID)
  const insertStmt = db.prepare(
    'INSERT INTO federated_contributions (id, family, strategy, window_ms, metrics, bot_age_days, contributed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const contrib of contributions) {
    insertStmt.run(contrib.id, contrib.family, contrib.strategy, contrib.windowMs, JSON.stringify(contrib.metrics), contrib.botAgeDays, contrib.contributedAt);
  }

  // Update config
  db.prepare(
    'UPDATE federated_learning_config SET last_contributed_at = ?, total_contributions = total_contributions + ?, updated_at = ? WHERE tenant_id = ?'
  ).run(now, contributions.length, now, auth.tenantId);

  return c.json({ success: true, data: { contributed: contributions.length } });
});

// ─── GET /api/federated/benchmarks ─────────────────────────────
// Returns strategy benchmarks for the current tenant's bot families
federatedRouter.get('/benchmarks', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const rows = db.prepare('SELECT * FROM strategy_benchmarks').all() as BenchmarkRow[];

  const benchmarks = rows.map(r => ({
    family: r.family,
    strategy: r.strategy,
    sampleSize: r.sample_size,
    successRate: JSON.parse(r.success_rate),
    pnlReturnPercent: JSON.parse(r.pnl_return_percent),
    errorRate: JSON.parse(r.error_rate),
    avgTickDurationMs: JSON.parse(r.avg_tick_duration_ms),
    updatedAt: r.updated_at,
  }));

  return c.json({ success: true, data: benchmarks });
});

// ─── POST /api/federated/recalculate ───────────────────────────
// Admin endpoint to recalculate benchmarks from all contributions
federatedRouter.post('/recalculate', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  // Only tenant owners can trigger recalculation (expensive operation)
  const db = getDb();
  const membership = db.prepare('SELECT role FROM tenant_members WHERE user_id = ? AND tenant_id = ?').get(auth.userId, auth.tenantId) as { role: string } | undefined;
  if (!membership || membership.role !== 'owner') {
    return c.json({ success: false, error: 'Only tenant owners can recalculate benchmarks' }, 403);
  }

  // Group contributions by family+strategy
  const contribs = db.prepare('SELECT * FROM federated_contributions').all() as ContribRow[];
  const groups = new Map<string, FederatedContribution[]>();

  for (const row of contribs) {
    const key = `${row.family}:${row.strategy}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({
      id: row.id,
      family: row.family as 'trading' | 'store' | 'social' | 'workforce',
      strategy: row.strategy,
      windowMs: row.window_ms,
      metrics: JSON.parse(row.metrics),
      botAgeDays: row.bot_age_days,
      contributedAt: row.contributed_at,
    });
  }

  let recalculated = 0;
  const upsert = db.prepare(`
    INSERT INTO strategy_benchmarks (family, strategy, sample_size, success_rate, pnl_return_percent, error_rate, avg_tick_duration_ms, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(family, strategy) DO UPDATE SET
      sample_size = ?, success_rate = ?, pnl_return_percent = ?, error_rate = ?, avg_tick_duration_ms = ?, updated_at = ?
  `);

  for (const [key, items] of groups) {
    const [family, strategy] = key.split(':');
    const benchmark = aggregateBenchmark(family as 'trading' | 'store' | 'social' | 'workforce', strategy, items);
    if (!benchmark) continue;

    const now = Date.now();
    const sr = JSON.stringify(benchmark.successRate);
    const pnl = JSON.stringify(benchmark.pnlReturnPercent);
    const er = JSON.stringify(benchmark.errorRate);
    const td = JSON.stringify(benchmark.avgTickDurationMs);

    upsert.run(family, strategy, benchmark.sampleSize, sr, pnl, er, td, now, benchmark.sampleSize, sr, pnl, er, td, now);
    recalculated++;
  }

  return c.json({ success: true, data: { recalculated } });
});
