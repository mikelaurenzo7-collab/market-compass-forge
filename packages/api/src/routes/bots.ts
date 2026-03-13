import { Hono } from 'hono';
import { z } from 'zod';
import type { BotFamily, Platform, BotStatus, TradingBotConfig, StoreBotConfig, SocialBotConfig, WorkforceBotConfig, TradingPlatform, StorePlatform, SocialPlatform, AutonomyLevel, StoreStrategy, SocialStrategy, TradingStrategy, WorkforceCategory, WorkforceStrategy } from '@beastbots/shared';
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

interface WorkerRuntimeMetrics {
  totalTicks: number;
  successfulActions: number;
  failedActions: number;
  deniedActions: number;
  totalPnlUsd: number;
  uptimeMs: number;
  lastErrorMessage?: string;
  lastErrorAt?: number;
}

interface WorkerRuntimeState {
  status: BotStatus;
  lastTickAt: number;
}

interface WorkerTickResult {
  botId: string;
  timestamp: number;
  action: string;
  result: string;
  details: Record<string, unknown>;
  durationMs: number;
}

function getWorkersBaseUrl(): string | null {
  const value = process.env.WORKERS_BASE_URL?.trim();
  return value ? value.replace(/\/+$/, '') : null;
}

function isWorkerControlPlaneEnabled(): boolean {
  return Boolean(getWorkersBaseUrl() && process.env.WORKER_AUTH_TOKEN);
}

function buildWorkerUrl(tenantId: string, botId: string, action: string, query?: Record<string, string | number | undefined>): string {
  const baseUrl = getWorkersBaseUrl();
  if (!baseUrl) throw new Error('WORKERS_BASE_URL is not configured');
  const url = new URL(`${baseUrl}/bot/${tenantId}/${botId}/${action}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function callWorkerControlPlane<T>(
  tenantId: string,
  botId: string,
  action: string,
  init?: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> },
): Promise<T> {
  const authToken = process.env.WORKER_AUTH_TOKEN;
  if (!authToken) throw new Error('WORKER_AUTH_TOKEN is not configured');

  const response = await fetch(buildWorkerUrl(tenantId, botId, action, init?.query), {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
      ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof json?.message === 'string'
      ? json.message
      : typeof json?.error === 'string'
        ? json.error
        : `Worker control plane request failed: ${response.status}`;
    throw new Error(message);
  }

  return json as T;
}

async function initWorkerRuntime(params: {
  botId: string;
  tenantId: string;
  family: BotFamily;
  platform: Platform;
  config: BotConfig;
  tickIntervalMs: number;
  credentials?: BotCredentials;
}): Promise<void> {
  await callWorkerControlPlane(params.tenantId, params.botId, 'init', {
    method: 'POST',
    body: {
      botId: params.botId,
      tenantId: params.tenantId,
      family: params.family,
      platform: params.platform,
      config: params.config,
      tickIntervalMs: params.tickIntervalMs,
      credentials: params.credentials,
    },
  });
}

async function syncRuntimeConfig(params: {
  tenantId: string;
  botId: string;
  family: BotFamily;
  platform: Platform;
  config: Record<string, unknown>;
}): Promise<void> {
  const normalizedConfig = normalizeRuntimeConfig(params.family, params.platform, params.config);
  const tickIntervalMs = familyTickIntervalMs(params.family);

  if (isWorkerControlPlaneEnabled()) {
    await callWorkerControlPlane(params.tenantId, params.botId, 'update', {
      method: 'POST',
      body: { config: normalizedConfig, tickIntervalMs },
    });
    return;
  }

  const runtime = getRuntime(params.tenantId, params.botId);
  runtime?.applyConfig({ config: normalizedConfig, tickIntervalMs });
}

async function getRuntimeMetricsSnapshot(tenantId: string, botId: string): Promise<{ metrics: WorkerRuntimeMetrics | null; status: BotStatus | null; heartbeat: number | null; history: WorkerTickResult[] }> {
  if (isWorkerControlPlaneEnabled()) {
    const [metrics, state, history] = await Promise.all([
      callWorkerControlPlane<WorkerRuntimeMetrics | { error: string }>(tenantId, botId, 'metrics').catch(() => null),
      callWorkerControlPlane<WorkerRuntimeState | { error: string }>(tenantId, botId, 'state').catch(() => null),
      callWorkerControlPlane<WorkerTickResult[] | { error: string }>(tenantId, botId, 'history', { query: { limit: 200 } }).catch(() => []),
    ]);

    return {
      metrics: metrics && !('error' in metrics) ? metrics : null,
      status: state && !('error' in state) ? state.status : null,
      heartbeat: state && !('error' in state) ? state.lastTickAt : null,
      history: Array.isArray(history) ? history : [],
    };
  }

  const runtime = getRuntime(tenantId, botId);
  return {
    metrics: runtime?.getMetrics() ?? null,
    status: runtime?.getStatus() ?? null,
    heartbeat: runtime?.getHeartbeat() ?? null,
    history: runtime?.getTickHistory(200) as WorkerTickResult[] ?? [],
  };
}

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

function inferWorkforceCategory(platform: string, config: Record<string, unknown>): WorkforceCategory {
  const explicitCategory = config.category;
  if (typeof explicitCategory === 'string') {
    return explicitCategory as WorkforceCategory;
  }

  const strategyHints = ((config.strategies as WorkforceStrategy[] | undefined) ?? []).concat(
    typeof config.strategy === 'string' ? [config.strategy as WorkforceStrategy] : []
  );
  if (strategyHints.some((strategy) => ['ticket_triage', 'auto_response'].includes(strategy))) return 'customer_support';
  if (strategyHints.some((strategy) => ['lead_scoring', 'crm_enrichment'].includes(strategy))) return 'sales_crm';
  if (strategyHints.some((strategy) => ['invoice_processing', 'expense_reconciliation'].includes(strategy))) return 'finance';
  if (strategyHints.some((strategy) => ['employee_onboarding'].includes(strategy))) return 'hr';
  if (strategyHints.some((strategy) => ['document_classification', 'data_extraction'].includes(strategy))) return 'document_processing';
  if (strategyHints.some((strategy) => ['email_triage', 'meeting_scheduler'].includes(strategy))) return 'email_management';
  if (strategyHints.some((strategy) => ['compliance_monitoring', 'audit_preparation', 'contract_review'].includes(strategy))) return 'compliance';
  if (strategyHints.some((strategy) => ['system_health_check'].includes(strategy))) return 'it_ops';
  if (strategyHints.some((strategy) => ['report_generation', 'knowledge_base_sync'].includes(strategy))) return 'reporting';
  if (strategyHints.some((strategy) => ['task_orchestration'].includes(strategy))) return 'project_management';
  if (strategyHints.some((strategy) => ['vendor_evaluation'].includes(strategy))) return 'procurement';

  if (platform === 'salesforce' || platform === 'hubspot') return 'sales_crm';
  if (platform === 'gmail') return 'email_management';
  if (platform === 'jira' || platform === 'github' || platform === 'notion') return 'project_management';
  if (platform === 'quickbooks' || platform === 'xero') return 'finance';
  if (platform === 'slack' || platform === 'teams') return 'customer_support';

  return 'project_management';
}

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
      trailingStopPercent: config.trailingStopPercent !== undefined ? Number(config.trailingStopPercent) : undefined,
      cooldownAfterLossMs: Number(config.cooldownAfterLossMs ?? 60_000),
      paperTrading: Boolean(config.paperTrading ?? true),
      useLLM: Boolean(config.useLLM ?? false),
      autonomyLevel: (config.autonomyLevel as AutonomyLevel) ?? 'manual',
      multiTimeframeConfirmation: Boolean(config.multiTimeframeConfirmation ?? false),
      platformConfig: (config.platformConfig as Record<string, unknown> | undefined) ?? undefined,
      gridLevels: (config.gridLevels as number[] | undefined) ?? undefined,
      openOrders: (config.openOrders as { price: number; side: 'buy' | 'sell' }[] | undefined) ?? undefined,
      arbitrageThresholdPercent: config.arbitrageThresholdPercent !== undefined ? Number(config.arbitrageThresholdPercent) : undefined,
      arbitragePrices: (config.arbitragePrices as number[] | undefined) ?? undefined,
      arbitragePlatforms: (config.arbitragePlatforms as TradingPlatform[] | undefined) ?? undefined,
      marketMakingSpread: config.marketMakingSpread !== undefined ? Number(config.marketMakingSpread) : undefined,
      marketMakingBid: config.marketMakingBid !== undefined ? Number(config.marketMakingBid) : undefined,
      marketMakingAsk: config.marketMakingAsk !== undefined ? Number(config.marketMakingAsk) : undefined,
      eventProbabilityData: (config.eventProbabilityData as TradingBotConfig['eventProbabilityData'] | undefined) ?? undefined,
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

  if (family === 'social') {
    return {
      platform: platform as SocialPlatform,
      strategies: (config.strategies as SocialStrategy[]) ?? ['content_calendar'],
      maxPostsPerDay: Number(config.maxPostsPerDay ?? 2),
      maxEngagementsPerHour: Number(config.maxEngagementsPerHour ?? 10),
      contentApprovalRequired: Boolean(config.contentApprovalRequired ?? true),
      sensitiveTopicKeywords: (config.sensitiveTopicKeywords as string[]) ?? [],
      brandVoiceGuidelines: (config.brandVoiceGuidelines as string) ?? 'professional',
      brandVoice: (config.brandVoice as string | undefined) ?? undefined,
      brandDescription: (config.brandDescription as string | undefined) ?? undefined,
      paperMode: Boolean(config.paperMode ?? true),
      useLLM: Boolean(config.useLLM ?? false),
      autonomyLevel: (config.autonomyLevel as AutonomyLevel) ?? 'manual',
      platformConfig: (config.platformConfig as Record<string, unknown> | undefined) ?? undefined,
    };
  }

  return {
    category: inferWorkforceCategory(platform, config),
    strategies: (config.strategies as WorkforceStrategy[]) ?? ['task_orchestration'],
    maxTasksPerHour: Number(config.maxTasksPerHour ?? 20),
    maxConcurrentTasks: Number(config.maxConcurrentTasks ?? 3),
    requireApprovalForExternal: Boolean(config.requireApprovalForExternal ?? true),
    escalationThresholdConfidence: Number(config.escalationThresholdConfidence ?? 0.75),
    dataAccessScopes: (config.dataAccessScopes as string[]) ?? ['tasks'],
    workingHoursUtc: (config.workingHoursUtc as WorkforceBotConfig['workingHoursUtc'] | undefined) ?? undefined,
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
  const previousConfig = JSON.parse(row.config || '{}') as Record<string, unknown>;
  const mergedConfig = parsed.data.config ? { ...previousConfig, ...parsed.data.config } : previousConfig;
  const newConfig = JSON.stringify(mergedConfig);
  const now = Date.now();

  const shouldSyncRuntime = row.status !== 'idle';
  if (shouldSyncRuntime) {
    try {
      await syncRuntimeConfig({
        tenantId: auth.tenantId,
        botId: id,
        family: row.family as BotFamily,
        platform: row.platform as Platform,
        config: mergedConfig,
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply config to active runtime',
      }, 502);
    }
  }

  try {
    db.prepare('UPDATE bots SET name = ?, config = ?, updated_at = ? WHERE id = ?').run(newName, newConfig, now, id);
  } catch (error) {
    if (shouldSyncRuntime) {
      try {
        await syncRuntimeConfig({
          tenantId: auth.tenantId,
          botId: id,
          family: row.family as BotFamily,
          platform: row.platform as Platform,
          config: previousConfig,
        });
      } catch (rollbackError) {
        console.error('Failed to roll back runtime config after DB update failure', rollbackError);
      }
    }

    throw error;
  }

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

  const normalizedConfig = normalizeRuntimeConfig(row.family as BotFamily, row.platform, parsedConfig);
  const credentials = lookupCredentials(auth.tenantId, row.platform);

  if (isWorkerControlPlaneEnabled()) {
    await initWorkerRuntime({
      botId: id,
      tenantId: auth.tenantId,
      family: row.family as BotFamily,
      platform: row.platform as Platform,
      config: normalizedConfig,
      tickIntervalMs: familyTickIntervalMs(row.family as BotFamily),
      credentials,
    });
    const startResult = await callWorkerControlPlane<{ ok: boolean; status: BotStatus; reason?: string }>(auth.tenantId, id, 'start', { method: 'POST' });
    if (!startResult.ok) {
      return c.json({ success: false, error: startResult.reason ?? 'Failed to start bot runtime' }, 400);
    }
  } else {
    let runtime = getRuntime(auth.tenantId, id);
    if (!runtime) {
      runtime = createRuntime({
        botId: id,
        tenantId: auth.tenantId,
        family: row.family as BotFamily,
        platform: row.platform as Platform,
        config: normalizedConfig,
        tickIntervalMs: familyTickIntervalMs(row.family as BotFamily),
        onStateChange: makePersistCallback(id, auth.tenantId, row.family as BotFamily, row.platform as Platform),
        credentials,
      });
    }
    const started = runtime.start();
    if (!started.ok) {
      return c.json({ success: false, error: 'Failed to start bot runtime' }, 400);
    }
  }

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
  if (isWorkerControlPlaneEnabled()) {
    await callWorkerControlPlane(auth.tenantId, id, 'pause', { method: 'POST' });
  } else {
    const runtime = getRuntime(auth.tenantId, id);
    runtime?.pause();
  }
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
  const runtimeSnapshot = await getRuntimeMetricsSnapshot(auth.tenantId, id);

  // Persist metrics snapshot + tick history before stopping
  if (runtimeSnapshot.metrics) {
      const metrics = runtimeSnapshot.metrics;
      db.prepare(
        'INSERT INTO bot_metrics (bot_id, total_ticks, successful_actions, failed_actions, denied_actions, total_pnl_usd, uptime_ms, last_error_message, last_error_at, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, metrics.totalTicks, metrics.successfulActions, metrics.failedActions, metrics.deniedActions, metrics.totalPnlUsd, metrics.uptimeMs, metrics.lastErrorMessage ?? null, metrics.lastErrorAt ?? null, Date.now());
  }

  if (runtimeSnapshot.history.length > 0) {
    const insertDecision = db.prepare(
      'INSERT INTO decision_log (bot_id, tenant_id, action, result, details, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const t of runtimeSnapshot.history) {
      insertDecision.run(id, auth.tenantId, t.action, t.result, JSON.stringify(t.details), t.durationMs, t.timestamp);
    }
  }

  if (isWorkerControlPlaneEnabled()) {
    await callWorkerControlPlane(auth.tenantId, id, 'stop', { method: 'POST' });
  } else {
    const runtime = getRuntime(auth.tenantId, id);
    runtime?.stop();
  }
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
  if (isWorkerControlPlaneEnabled()) {
    await callWorkerControlPlane(auth.tenantId, id, 'kill', { method: 'POST' });
  } else {
    const runtime = getRuntime(auth.tenantId, id);
    runtime?.killSwitch();
  }
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
  if (isWorkerControlPlaneEnabled()) {
    await callWorkerControlPlane(auth.tenantId, id, 'delete', { method: 'POST' }).catch(() => undefined);
  } else {
    destroyRuntime(auth.tenantId, id);
  }
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

  const runtimeSnapshot = await getRuntimeMetricsSnapshot(auth.tenantId, id);
  const metrics = runtimeSnapshot.metrics;
  const status = runtimeSnapshot.status ?? row.status;
  const heartbeat = runtimeSnapshot.heartbeat;

  let enriched: any = metrics ?? {
    totalTicks: 0,
    successfulActions: 0,
    failedActions: 0,
    deniedActions: 0,
    totalPnlUsd: 0,
    initialBalanceUsd: 0,
    uptimeMs: 0,
    totalTrades: 0,
    winningTrades: 0,
    consecutiveLosses: 0,
    custom: {},
  };
  if (enriched.initialBalanceUsd && enriched.initialBalanceUsd !== 0) {
    enriched.roiPercent = (enriched.totalPnlUsd / enriched.initialBalanceUsd) * 100;
  }
  // compute win rate if trades present
  if (enriched.totalTrades && enriched.totalTrades > 0) {
    enriched.winRate = enriched.winningTrades / enriched.totalTrades;
  }

  return c.json({
    success: true,
    data: {
      botId: id,
      family: row.family,
      status,
      heartbeat,
<<<<<<< HEAD
      metrics: enriched,
=======
      authority: {
        mode: isWorkerControlPlaneEnabled() ? 'worker-control-plane' : 'local-runtime',
        label: isWorkerControlPlaneEnabled() ? 'Cloudflare Durable Object' : 'Local runtime registry',
        live: Boolean(metrics || heartbeat),
      },
      metrics: metrics ?? {
        totalTicks: 0,
        successfulActions: 0,
        failedActions: 0,
        deniedActions: 0,
        totalPnlUsd: 0,
        uptimeMs: 0,
      },
>>>>>>> f42fb9ea410432b2e524632c6241d5d491145662
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
  const history = isWorkerControlPlaneEnabled()
    ? await callWorkerControlPlane<WorkerTickResult[]>(auth.tenantId, id, 'history', { query: { limit } }).catch(() => [])
    : (getRuntime(auth.tenantId, id)?.getTickHistory(limit) as WorkerTickResult[] ?? []);

  return c.json({ success: true, data: { botId: id, ticks: history } });
});

botsRouter.get('/:id/decisions', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id FROM bots WHERE id = ? AND tenant_id = ?').get(id, auth.tenantId) as BotRow | undefined;
  if (!row) return c.json({ success: false, error: 'Bot not found' }, 404);

  const history = isWorkerControlPlaneEnabled()
    ? await callWorkerControlPlane<WorkerTickResult[]>(auth.tenantId, id, 'history', { query: { limit: 200 } }).catch(() => [])
    : (getRuntime(auth.tenantId, id)?.getTickHistory(200) as WorkerTickResult[] ?? []);

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
  if (isWorkerControlPlaneEnabled()) {
    console.log('[Restore] Worker control plane enabled; skipping local runtime restoration');
    return;
  }

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
