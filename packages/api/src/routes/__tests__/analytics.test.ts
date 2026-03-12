import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tmpDb = path.join(os.tmpdir(), `beastbots-test-analytics-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes!';

import app from '../../server';
import { closeDb, getDb } from '../../lib/db';
import { signAccessToken } from '../../lib/auth';

describe('analytics endpoints', () => {
  let db: ReturnType<typeof getDb>;
  let authHeader: string;
  let tenantId: string;

  beforeAll(async () => {
    db = getDb();

    const now = Date.now();
    const userId = `user-analytics-${now}`;
    tenantId = `tenant-analytics-${now}`;

    db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, 'analytics@example.com', 'hash', 'Analytics User', now, now);
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(tenantId, 'Analytics Tenant', userId, 'pro', now);
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
      .run(tenantId, userId, 'owner');

    db.prepare('INSERT INTO credentials (id, tenant_id, platform, account_label, credential_type, encrypted_data, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(`cred-${now}`, tenantId, 'shopify', 'Primary Shopify', 'oauth', 'encrypted', 'active', now, now);

    const storeBotId = `bot-store-${now}`;
    const tradingBotId = `bot-trading-${now}`;

    db.prepare('INSERT INTO bots (id, tenant_id, name, family, platform, config, safety_config, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(storeBotId, tenantId, 'Store Operator', 'store', 'shopify', JSON.stringify({}), JSON.stringify({}), 'running', now - 10_000, now - 10_000);
    db.prepare('INSERT INTO bots (id, tenant_id, name, family, platform, config, safety_config, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(tradingBotId, tenantId, 'Trading Operator', 'trading', 'coinbase', JSON.stringify({}), JSON.stringify({}), 'paused', now - 8_000, now - 8_000);

    const insertMetrics = db.prepare('INSERT INTO bot_metrics (bot_id, total_ticks, successful_actions, failed_actions, denied_actions, total_pnl_usd, uptime_ms, last_error_message, last_error_at, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertMetrics.run(storeBotId, 10, 4, 1, 0, 40, 50_000, null, null, now - 7_000);
    insertMetrics.run(storeBotId, 25, 9, 2, 1, 125.5, 90_000, null, null, now - 2_000);
    insertMetrics.run(tradingBotId, 12, 6, 2, 1, -20.25, 70_000, null, null, now - 3_000);

    const insertDecision = db.prepare('INSERT INTO decision_log (bot_id, tenant_id, action, result, details, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertDecision.run(storeBotId, tenantId, 'price_adjustment', 'executed', '{}', 140, now - 4_000);
    insertDecision.run(storeBotId, tenantId, 'inventory_sync', 'allowed', '{}', 110, now - 3_500);
    insertDecision.run(tradingBotId, tenantId, 'rebalance', 'blocked', '{}', 210, now - 3_200);

    const token = await signAccessToken({ userId, tenantId, email: 'analytics@example.com' });
    authHeader = `Bearer ${token}`;
  });

  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch {
      // ignore cleanup errors in test teardown
    }
  });

  it('GET /api/analytics/summary returns current per-family ROI signals without double counting old snapshots', async () => {
    const res = await app.request('/api/analytics/summary', {
      headers: { Authorization: authHeader },
    });

    expect(res.status).toBe(200);
    const json = await res.json() as any;

    expect(json.success).toBe(true);
    expect(json.data.metrics.totalTicks).toBe(37);
    expect(json.data.metrics.totalActions).toBe(21);
    expect(json.data.metrics.totalPnlUsd).toBe(105.25);
    expect(json.data.connectedPlatforms).toBe(1);

    expect(Array.isArray(json.data.familyRoi)).toBe(true);
    expect(json.data.familyRoi.map((entry: any) => entry.family)).toEqual(['store', 'trading']);

    const storeSummary = json.data.familyRoi.find((entry: any) => entry.family === 'store');
    expect(storeSummary.totalBots).toBe(1);
    expect(storeSummary.runningBots).toBe(1);
    expect(storeSummary.totalActions).toBe(12);
    expect(storeSummary.totalPnlUsd).toBe(125.5);
    expect(storeSummary.primarySignal.label).toBe('Tracked Value');
    expect(storeSummary.secondarySignal.label).toBe('Commerce Ops');

    const tradingSummary = json.data.familyRoi.find((entry: any) => entry.family === 'trading');
    expect(tradingSummary.totalBots).toBe(1);
    expect(tradingSummary.totalActions).toBe(9);
    expect(tradingSummary.primarySignal.label).toBe('Net P&L');
    expect(tradingSummary.primarySignal.value).toBe('-$20.25');
  });

  it('GET /api/analytics/timeseries returns pnlUsd points for the web chart', async () => {
    const res = await app.request('/api/analytics/timeseries?period=24h', {
      headers: { Authorization: authHeader },
    });

    expect(res.status).toBe(200);
    const json = await res.json() as any;

    expect(json.success).toBe(true);
    expect(Array.isArray(json.data.pnlSnapshots)).toBe(true);
    expect(json.data.pnlSnapshots.length).toBeGreaterThan(0);
    expect(json.data.pnlSnapshots[0]).toHaveProperty('pnlUsd');
    expect(json.data.pnlSnapshots[0]).not.toHaveProperty('pnl');
  });
});