import { Hono } from 'hono';
import { z } from 'zod';
import type { BotFamily, Platform, BotStatus, TradingBotConfig, StoreBotConfig, SocialBotConfig, WorkforceBotConfig, TradingPlatform, StorePlatform, SocialPlatform, AutonomyLevel, StoreStrategy, SocialStrategy, TradingStrategy } from '@beastbots/shared';
import {
  INTEGRATIONS,
  DEFAULT_PRICING,
  createDefaultBudget,
  createDefaultCircuitBreaker,
  createDefaultPolicies,
  TRADING_PLATFORM_CONFIGS,
  STORE_PLATFORM_STRATEGIES,
  SOCIAL_PLATFORM_STRATEGIES,
} from '@beastbots/shared';

import { verifyAuthHeader } from '../lib/auth.js';
import { getDb } from '../lib/db.js';
import { logAudit } from '../lib/audit.js';
import { decrypt } from '../lib/crypto.js';
import { createRuntime, getRuntime, destroyRuntime } from '@beastbots/workers';
import type { RuntimeState } from '@beastbots/workers';

export const botsRouter = new Hono();

/* ─── DB Row Interfaces ─── */
interface BotRow {
  id: string;
  tenant_id: string;
  name: string;
  family: string;
  platform: string;
  status: string;
  config: string;
  created_at: number;
  updated_at: number;
}
interface BotStatusRow { id: string; tenant_id: string; status: string; }
interface BotFamilyRow { id: string; tenant_id: string; family: string; status: string; }
interface BotIdRow { id: string; tenant_id: string; }
interface CredRow { id: string; }
interface TickRow { ts: number; json: string; }
interface StateRow { state_json: string; tick_history: string; }

// Build a callback that persists runtime state to bot_state table
function makePersistCallback(botId: string, tenantId: string, family: BotFamily, platform: Platform) {
  return (state: RuntimeState) => {
    try {
      const db = getDb();
      const runtime = getRuntime(tenantId, botId);
      if (!runtime) return;
      const s = runtime.serializeState();
      if (!s) return;
      db.prepare(`
        INSERT OR REPLACE INTO bot_state (bot_id, tenant_id, family, platform, status, engine_state, safety_state, metrics, tick_history, last_tick_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(botId, tenantId, family, platform, state.status, s.engineState, s.safetyState, s.metrics, s.tickHistory, s.lastTickAt, Date.now());
    } catch (err) {
      console.error(`[Persist] Failed to persist state for ${botId}:`, err);
    }
  };
}

/** Look up and decrypt platform credentials for a tenant. Returns undefined if none stored. */
type BotCredentials = { apiKey: string; apiSecret: string; passphrase?: string; shopDomain?: string; accessToken?: string; sandbox?: boolean };

function lookupCredentials(tenantId: string, platform: string): BotCredentials | undefined {
  const db = getDb();
  const row = db.prepare(
    'SELECT encrypted_data FROM credentials WHERE tenant_id = ? AND platform = ? AND status = ? LIMIT 1'
  ).get(tenantId, platform, 'active') as { encrypted_data: string } | undefined;
  if (!row) return undefined;
  try {
    return JSON.parse(decrypt(row.encrypted_data)) as BotCredentials;
  } catch {
    console.error(`[Credentials] Failed to decrypt credentials for ${platform} / tenant ${tenantId}`);
    return undefined;
  }
}

type BotConfig = TradingBotConfig | StoreBotConfig | SocialBotConfig | WorkforceBotConfig;

function normalizeRuntimeConfig(family: BotFamily, platform: string, config: Record<string, unknown>): BotConfig {
  if (family === 'trading') {
    return {
      platform: platform as TradingPlatform,
      strategy: (config.strategy as TradingStrategy) ?? 'dca',
      symbols: (config.symbols as string[]) ?? ['BTC-USD'],
      maxPositionSizeUsd: Number(config.maxPositionSizeUsd ?? 100),
      maxDailyLossUsd: Number(config.maxDailyLossUsd ?? 1000),
      maxOpenPositions: Number(config.maxOpenPositions ?? 3),
      stopLossPercent: Number(config.stopLossPercent ?? 0.02),
      takeProfitPercent: Number(config.takeProfitPercent ?? 0.04),
      cooldownAfterLossMs: Number(config.cooldownAfterLossMs ?? 60_000),
      paperTrading: Boolean(config.paperTrading ?? true),
      useLLM: Boolean(config.useLLM ?? false),
      autonomyLevel: (config.autonomyLevel as AutonomyLevel) ?? 'manual',
    };
  }

  if (family === 'store') {
    return {
      platform: platform as StorePlatform,
      strategies: (config.strategies as StoreStrategy[]) ?? ['dynamic_pricing'],
      maxPriceChangePercent: Number(config.maxPriceChangePercent ?? 5),
      minMarginPercent: Number(config.minMarginPercent ?? 10),
      syncIntervalMs: Number(config.syncIntervalMs ?? 300_000),
      autoApplyPricing: Boolean(config.autoApplyPricing ?? false),
      autoReorder: Boolean(config.autoReorder ?? false),
      paperMode: Boolean(config.paperMode ?? true),
      useLLM: Boolean(config.useLLM ?? false),
      autonomyLevel: (config.autonomyLevel as AutonomyLevel) ?? 'manual',
    };
  }

  return {
    platform: platform as SocialPlatform,
    strategies: (config.strategies as SocialStrategy[]) ?? ['content_calendar'],
    maxPostsPerDay: Number(config.maxPostsPerDay ?? 2),
    maxEngagementsPerHour: Number(config.maxEngagementsPerHour ?? 10),
    contentApprovalRequired: Boolean(config.contentApprovalRequired ?? true),
    sensitiveTopicKeywords: (config.sensitiveTopicKeywords as string[]) ?? [],
    brandVoiceGuidelines: (config.brandVoiceGuidelines as string) ?? 'professional',
    paperMode: Boolean(config.paperMode ?? true),
    useLLM: Boolean(config.useLLM ?? false),
    autonomyLevel: (config.autonomyLevel as AutonomyLevel) ?? 'manual',
  };
}

function familyTickIntervalMs(family: BotFamily): number {
  if (family === 'trading') return 1_000;
  if (family === 'store') return 300_000;
  if (family === 'social') return 900_000;
  return 60_000;
}

// ─── In-memory bot store (replaced by DB in production) ──────

interface BotRecord {
  id: string;
  tenantId: string;
  family: BotFamily;
  platform: Platform;
  name: string;
  status: BotStatus;
  config: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

// Persistence: use `bots` table in SQLite

// ─── Schemas ──────────────────────────────────────────────────

const createBotSchema = z.object({
  family: z.enum(['trading', 'store', 'social', 'workforce']),
  platform: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  config: z.record(z.unknown()).optional(),
  credentialId: z.string().optional(),
});

const updateBotSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  config: z.record(z.unknown()).optional(),
});

// ─── List Bots ────────────────────────────────────────────────

botsRouter.get('/', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const family = c.req.query('family') as BotFamily | undefined;
  const db = getDb();

  let rows;
  if (family) {
    rows = db.prepare('SELECT id, tenant_id, name, family, platform, status, config, created_at, updated_at FROM bots WHERE tenant_id = ? AND family = ? ORDER BY created_at DESC').all(auth.tenantId, family);
  } else {
    rows = db.prepare('SELECT id, tenant_id, name, family, platform, status, config, created_at, updated_at FROM bots WHERE tenant_id = ? ORDER BY created_at DESC').all(auth.tenantId);
  }

  const results = rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    family: r.family,
    platform: r.platform,
    status: r.status,
    config: JSON.parse(r.config || '{}'),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return c.json({ success: true, data: results });
});

// ─── Get Bot ──────────────────────────────────────────────────

botsRouter.get('/:id', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id, name, family, platform, status, config, created_at, updated_at FROM bots WHERE id = ? AND tenant_id = ?').get(id, auth.tenantId) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);

  const bot = {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    family: row.family,
    platform: row.platform,
    status: row.status,
    config: JSON.parse(row.config || '{}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return c.json({ success: true, data: bot });
});

// ─── Create Bot ───────────────────────────────────────────────

botsRouter.post('/', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const body = await c.req.json();
  const parsed = createBotSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues }, 400);
  }

  const { family, platform, name, config, credentialId } = parsed.data;

  const db = getDb();

  // Validate platform exists
  const validPlatform = INTEGRATIONS.find((i) => i.id === platform);
  if (!validPlatform) {
    return c.json({ success: false, error: `Unknown platform: ${platform}` }, 400);
  }

  // Enforce plan bot limits
  const tenant = db.prepare('SELECT plan FROM tenants WHERE id = ?').get(auth.tenantId) as { plan: string } | undefined;
  const tier = (tenant?.plan ?? 'starter') as 'starter' | 'pro' | 'enterprise';
  const planDef = DEFAULT_PRICING.find((p) => p.family === family && p.tier === tier);
  if (planDef) {
    const currentCount = db.prepare('SELECT COUNT(*) as cnt FROM bots WHERE tenant_id = ? AND family = ?').get(auth.tenantId, family) as { cnt: number };
    if (currentCount.cnt >= planDef.maxBots) {
      const nextTier = tier === 'starter' ? 'pro' : tier === 'pro' ? 'enterprise' : null;
      const upgradeMsg = nextTier
        ? `Upgrade to ${nextTier} for up to ${DEFAULT_PRICING.find(p => p.family === family && p.tier === nextTier)?.maxBots} ${family} bots`
        : `Contact sales for additional ${family} bot capacity`;
      const addOnMsg = planDef.addOnBotUsd > 0
        ? `, or add extra bots at $${planDef.addOnBotUsd}/mo each`
        : '';
      return c.json({
        success: false,
        error: `${tier.charAt(0).toUpperCase() + tier.slice(1)} plan allows ${planDef.maxBots} ${family} bot${planDef.maxBots > 1 ? 's' : ''}. ${upgradeMsg}${addOnMsg}.`,
        code: 'PLAN_BOT_LIMIT',
        currentCount: currentCount.cnt,
        maxBots: planDef.maxBots,
        tier,
        family,
      }, 403);
    }
  }

  // Validate credentialId if provided
  if (credentialId) {
    const cred = db.prepare('SELECT id FROM credentials WHERE id = ? AND tenant_id = ? AND platform = ?').get(credentialId, auth.tenantId, platform) as { id: string } | undefined;
    if (!cred) {
      return c.json({ success: false, error: 'Invalid credential — must belong to your account and match the bot platform' }, 400);
    }
  }

  const id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  db.prepare('INSERT INTO bots (id, tenant_id, name, family, platform, status, config, safety_config, credential_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, auth.tenantId, name, family, platform, 'idle', JSON.stringify(config ?? {}), JSON.stringify({}), credentialId ?? null, now, now);

  logAudit({
    tenantId: auth.tenantId,
    action: 'create_bot',
    result: 'success',
    riskLevel: 'low',
    details: JSON.stringify({ botId: id, platform }),
  });

  const row = db.prepare('SELECT id, tenant_id, name, family, platform, status, config, created_at, updated_at FROM bots WHERE id = ?').get(id) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found after creation' }, 404);
  const bot = {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    family: row.family,
    platform: row.platform,
    status: row.status,
    config: JSON.parse(row.config || '{}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return c.json({ success: true, data: bot }, 201);
});

// ─── Update Bot ───────────────────────────────────────────────

botsRouter.patch('/:id', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id, name, family, platform, status, config, created_at, updated_at FROM bots WHERE id = ?').get(id) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);
  if (row.tenant_id !== auth.tenantId) return c.json({ success: false, error: 'Not authorized' }, 403);

  const body = await c.req.json();
  const parsed = updateBotSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues }, 400);
  }

  const newName = parsed.data.name ?? row.name;
  const newConfig = parsed.data.config ? JSON.stringify({ ...JSON.parse(row.config || '{}'), ...parsed.data.config }) : row.config;
  const now = Date.now();

  db.prepare('UPDATE bots SET name = ?, config = ?, updated_at = ? WHERE id = ?').run(newName, newConfig, now, id);

  logAudit({
    tenantId: auth.tenantId,
    action: 'update_bot',
    result: 'success',
    riskLevel: 'low',
    details: JSON.stringify({ botId: id }),
  });

  const updated = db.prepare('SELECT id, tenant_id, name, family, platform, status, config, created_at, updated_at FROM bots WHERE id = ?').get(id) as BotRow | undefined;
  if (!updated) return c.json({ success: false, error: 'Bot not found after update' }, 404);
  const bot = {
    id: updated.id,
    tenantId: updated.tenant_id,
    name: updated.name,
    family: updated.family,
    platform: updated.platform,
    status: updated.status,
    config: JSON.parse(updated.config || '{}'),
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };

  return c.json({ success: true, data: bot });
});

// ─── Bot Actions ──────────────────────────────────────────────

botsRouter.post('/:id/start', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);
  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id, status, family, platform, config FROM bots WHERE id = ? AND tenant_id = ?').get(id, auth.tenantId) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);

  const parsedConfig = JSON.parse(row.config || '{}') as Record<string, unknown>;
  if (row.family === 'trading' && parsedConfig.paperTrading === false) {
    const cred = db.prepare('SELECT id FROM credentials WHERE tenant_id = ? AND platform = ?').get(auth.tenantId, row.platform) as CredRow | undefined;
    if (!cred) {
      return c.json({ success: false, error: 'Trading live mode requires connected credentials' }, 400);
    }
  }

  let runtime = getRuntime(auth.tenantId, id);
  if (!runtime) {
    const credentials = lookupCredentials(auth.tenantId, row.platform);
    runtime = createRuntime({
      botId: id,
      tenantId: auth.tenantId,
      family: row.family as BotFamily,
      platform: row.platform as Platform,
      config: normalizeRuntimeConfig(row.family as BotFamily, row.platform, parsedConfig),
      tickIntervalMs: familyTickIntervalMs(row.family as BotFamily),
      onStateChange: makePersistCallback(id, auth.tenantId, row.family as BotFamily, row.platform as Platform),
      credentials,
    });
  }
  runtime.start();

  db.prepare('UPDATE bots SET status = ?, updated_at = ? WHERE id = ?').run('running', Date.now(), id);
  logAudit({
    tenantId: auth.tenantId,
    action: 'start_bot',
    result: 'success',
    riskLevel: 'low',
    details: JSON.stringify({ botId: id }),
  });
  return c.json({ success: true, data: { id, status: 'running' } });
});

botsRouter.post('/:id/pause', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);
  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id, status FROM bots WHERE id = ? AND tenant_id = ?').get(id, auth.tenantId) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);
  const runtime = getRuntime(auth.tenantId, id);
  runtime?.pause();
  db.prepare('UPDATE bots SET status = ?, updated_at = ? WHERE id = ?').run('paused', Date.now(), id);
  logAudit({
    tenantId: auth.tenantId,
    action: 'pause_bot',
    result: 'success',
    riskLevel: 'low',
    details: JSON.stringify({ botId: id }),
  });
  return c.json({ success: true, data: { id, status: 'paused' } });
});

botsRouter.post('/:id/stop', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);
  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id, status FROM bots WHERE id = ? AND tenant_id = ?').get(id, auth.tenantId) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);
  const runtime = getRuntime(auth.tenantId, id);

  // Persist metrics snapshot + tick history before stopping
  if (runtime) {
    const metrics = runtime.getMetrics();
    if (metrics) {
      db.prepare(
        'INSERT INTO bot_metrics (bot_id, total_ticks, successful_actions, failed_actions, denied_actions, total_pnl_usd, uptime_ms, last_error_message, last_error_at, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, metrics.totalTicks, metrics.successfulActions, metrics.failedActions, metrics.deniedActions, metrics.totalPnlUsd, metrics.uptimeMs, metrics.lastErrorMessage ?? null, metrics.lastErrorAt ?? null, Date.now());
    }

    const history = runtime.getTickHistory(200);
    const insertDecision = db.prepare(
      'INSERT INTO decision_log (bot_id, tenant_id, action, result, details, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const t of history) {
      insertDecision.run(id, auth.tenantId, t.action, t.result, JSON.stringify(t.details), t.durationMs, t.timestamp);
    }
  }

  runtime?.stop();
  db.prepare('UPDATE bots SET status = ?, updated_at = ? WHERE id = ?').run('stopped', Date.now(), id);
  logAudit({
    tenantId: auth.tenantId,
    action: 'stop_bot',
    result: 'success',
    riskLevel: 'low',
    details: JSON.stringify({ botId: id }),
  });
  return c.json({ success: true, data: { id, status: 'stopped' } });
});

botsRouter.post('/:id/kill', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);
  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id, status FROM bots WHERE id = ? AND tenant_id = ?').get(id, auth.tenantId) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);
  const runtime = getRuntime(auth.tenantId, id);
  runtime?.killSwitch();
  db.prepare('UPDATE bots SET status = ?, updated_at = ? WHERE id = ?').run('stopped', Date.now(), id);
  logAudit({
    tenantId: auth.tenantId,
    action: 'kill_bot',
    result: 'success',
    riskLevel: 'high',
    details: JSON.stringify({ botId: id }),
  });
  return c.json({ success: true, data: { id, status: 'stopped', killSwitch: true } });
});

// ─── Delete Bot ───────────────────────────────────────────────

botsRouter.delete('/:id', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id, status FROM bots WHERE id = ?').get(id) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);
  if (row.tenant_id !== auth.tenantId) return c.json({ success: false, error: 'Not authorized' }, 403);
  if (row.status === 'running') {
    return c.json({ success: false, error: 'Cannot delete a running bot — stop it first' }, 400);
  }
  destroyRuntime(auth.tenantId, id);
  db.prepare('DELETE FROM bots WHERE id = ?').run(id);
  db.prepare('DELETE FROM bot_state WHERE bot_id = ?').run(id);
  logAudit({
    tenantId: auth.tenantId,
    action: 'delete_bot',
    result: 'success',
    riskLevel: 'medium',
    details: JSON.stringify({ botId: id }),
  });
  return c.json({ success: true, data: { deleted: id } });
});

// ─── Platform Capabilities ────────────────────────────────────

botsRouter.get('/platforms/trading', (c) => {
  return c.json({ success: true, data: TRADING_PLATFORM_CONFIGS });
});

botsRouter.get('/platforms/store', (c) => {
  return c.json({ success: true, data: STORE_PLATFORM_STRATEGIES });
});

botsRouter.get('/platforms/social', (c) => {
  return c.json({ success: true, data: SOCIAL_PLATFORM_STRATEGIES });
});

// ─── Observability ────────────────────────────────────────────

botsRouter.get('/:id/metrics', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id, family, status FROM bots WHERE id = ? AND tenant_id = ?').get(id, auth.tenantId) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);

  const runtime = getRuntime(auth.tenantId, id);
  const metrics = runtime?.getMetrics() ?? null;
  const status = runtime?.getStatus() ?? row.status;
  const heartbeat = runtime?.getHeartbeat() ?? null;

  return c.json({
    success: true,
    data: {
      botId: id,
      family: row.family,
      status,
      heartbeat,
      metrics: metrics ?? {
        totalTicks: 0,
        successfulActions: 0,
        failedActions: 0,
        deniedActions: 0,
        totalPnlUsd: 0,
        uptimeMs: 0,
      },
    },
  });
});

botsRouter.get('/:id/trace', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id FROM bots WHERE id = ? AND tenant_id = ?').get(id, auth.tenantId) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);

  const limit = Math.min(Number(c.req.query('limit') ?? '50'), 200);
  const runtime = getRuntime(auth.tenantId, id);
  const history = runtime?.getTickHistory(limit) ?? [];

  return c.json({ success: true, data: { botId: id, ticks: history } });
});

botsRouter.get('/:id/decisions', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id FROM bots WHERE id = ? AND tenant_id = ?').get(id, auth.tenantId) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);

  const runtime = getRuntime(auth.tenantId, id);
  const history = runtime?.getTickHistory(200) ?? [];

  // Filter to only actionable decisions (not heartbeats)
  const decisions = history.filter((t) => t.result !== 'skipped' || (t.details as Record<string, unknown>)?.suggestedSignal);

  return c.json({ success: true, data: { botId: id, decisions } });
});

botsRouter.get('/:id/history', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id FROM bots WHERE id = ? AND tenant_id = ?').get(id, auth.tenantId) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);

  const limit = Math.min(Number(c.req.query('limit') ?? '100'), 500);
  const rows = db.prepare(
    'SELECT action, result, details, duration_ms AS durationMs, created_at AS timestamp FROM decision_log WHERE bot_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(id, auth.tenantId, limit) as { action: string; result: string; details: string; durationMs: number; timestamp: number }[];

  const decisions = rows.map((r) => ({
    action: r.action,
    result: r.result,
    details: JSON.parse(r.details || '{}'),
    durationMs: r.durationMs,
    timestamp: r.timestamp,
  }));

  // Also include persisted metrics snapshots
  const metricsRows = db.prepare(
    'SELECT total_ticks AS totalTicks, successful_actions AS successfulActions, failed_actions AS failedActions, denied_actions AS deniedActions, total_pnl_usd AS totalPnlUsd, uptime_ms AS uptimeMs, recorded_at AS recordedAt FROM bot_metrics WHERE bot_id = ? ORDER BY recorded_at DESC LIMIT 10'
  ).all(id) as { totalTicks: number; successfulActions: number; failedActions: number; deniedActions: number; totalPnlUsd: number; uptimeMs: number; recordedAt: number }[];

  return c.json({
    success: true,
    data: { botId: id, decisions, metricsSnapshots: metricsRows },
  });
});

// ─── Runtime Restoration ──────────────────────────────────────

/**
 * Restores runtimes for bots that were running/paused when the server last shut down.
 * Called once during API startup.
 */
export function restoreRuntimes(): void {
  try {
    const db = getDb();
    const rows = db.prepare(
      `SELECT bs.bot_id, bs.tenant_id, bs.family, bs.platform, bs.status,
              bs.engine_state, bs.safety_state, bs.metrics, bs.tick_history, bs.last_tick_at,
              b.config, b.name
       FROM bot_state bs
       JOIN bots b ON b.id = bs.bot_id
       WHERE bs.status IN ('running', 'paused')`
    ).all() as { bot_id: string; tenant_id: string; family: string; platform: string; status: string; engine_state: string; safety_state: string; metrics: string; tick_history: string; last_tick_at: number; config: string; name: string }[];

    let restored = 0;
    for (const row of rows) {
      try {
        const parsedConfig = JSON.parse(row.config || '{}') as Record<string, unknown>;
        const credentials = lookupCredentials(row.tenant_id, row.platform);
        const runtime = createRuntime({
          botId: row.bot_id,
          tenantId: row.tenant_id,
          family: row.family as BotFamily,
          platform: row.platform as Platform,
          config: normalizeRuntimeConfig(row.family as BotFamily, row.platform, parsedConfig),
          tickIntervalMs: familyTickIntervalMs(row.family as BotFamily),
          onStateChange: makePersistCallback(row.bot_id, row.tenant_id, row.family as BotFamily, row.platform as Platform),
          credentials,
        });

        runtime.restoreState({
          engineState: row.engine_state,
          safetyState: row.safety_state,
          metrics: row.metrics,
          tickHistory: row.tick_history,
          status: row.status,
          lastTickAt: row.last_tick_at,
        });

        if (row.status === 'running') {
          runtime.start();
        }
        restored++;
      } catch (err) {
        console.error(`[Restore] Failed to restore bot ${row.bot_id}:`, err);
        // Mark as stopped so we don't retry on next restart
        db.prepare('UPDATE bot_state SET status = ? WHERE bot_id = ?').run('stopped', row.bot_id);
        db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('stopped', row.bot_id);
      }
    }

    if (restored > 0) {
      console.log(`[Restore] Restored ${restored} runtime(s)`);
    }
  } catch (err) {
    console.error('[Restore] Runtime restoration failed:', err);
  }
}
