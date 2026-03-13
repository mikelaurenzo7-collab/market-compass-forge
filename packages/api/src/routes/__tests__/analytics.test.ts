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

    const insertStoreOutcome = db.prepare('INSERT INTO store_roi_events (id, tenant_id, platform, event_type, external_id, revenue_usd, units, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertStoreOutcome.run(`store-order-${now}`, tenantId, 'shopify', 'order_created', 'shopify-order-1', 189.75, 4, JSON.stringify({ id: 'shopify-order-1' }), now - 1_500);
    insertStoreOutcome.run(`store-fulfilled-${now}`, tenantId, 'shopify', 'order_fulfilled', 'shopify-order-1', 0, 4, JSON.stringify({ id: 'shopify-order-1' }), now - 1_200);
    insertStoreOutcome.run(`store-stockout-${now}`, tenantId, 'shopify', 'inventory_stockout', 'sku-1:location-1:event', 0, 0, JSON.stringify({ inventory_item_id: 'sku-1' }), now - 900);

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
    expect(storeSummary.primarySignal.label).toBe('Revenue Captured');
    expect(storeSummary.primarySignal.value).toBe('+$189.75');
    expect(storeSummary.secondarySignal.label).toBe('Orders Captured');
    expect(storeSummary.secondarySignal.value).toBe('1');
    expect(storeSummary.tertiarySignal.label).toBe('Stockout Alerts');
    expect(storeSummary.tertiarySignal.value).toBe('1');

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

  it('GET /api/analytics/store-outcomes returns explicit store revenue and recent event data', async () => {
    const res = await app.request('/api/analytics/store-outcomes?period=7d', {
      headers: { Authorization: authHeader },
    });

    expect(res.status).toBe(200);
    const json = await res.json() as any;

    expect(json.success).toBe(true);
    expect(json.data.summary.revenueUsd).toBe(189.75);
    expect(json.data.summary.ordersCount).toBe(1);
    expect(json.data.summary.fulfilledOrdersCount).toBe(1);
    expect(json.data.summary.stockoutAlerts).toBe(1);
    expect(Array.isArray(json.data.timeseries)).toBe(true);
    expect(Array.isArray(json.data.recentEvents)).toBe(true);
    expect(json.data.recentEvents[0]).toHaveProperty('eventType');
  });

  it('GET /api/analytics/store-outcomes filters by platform', async () => {
    db.prepare('INSERT INTO store_roi_events (id, tenant_id, platform, event_type, external_id, revenue_usd, units, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(`store-order-amazon`, tenantId, 'amazon', 'order_created', 'amazon-order-1', 50, 1, JSON.stringify({ id: 'amazon-order-1' }), Date.now() - 800);

    const res = await app.request('/api/analytics/store-outcomes?period=7d&platform=shopify', {
      headers: { Authorization: authHeader },
    });

    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.platform).toBe('shopify');
    expect(json.data.summary.revenueUsd).toBe(189.75);
    expect(json.data.recentEvents.every((event: any) => event.eventType.startsWith('order_') || event.eventType.startsWith('inventory_'))).toBe(true);
  });

  it('GET /api/analytics/store-outcomes keeps summary and timeseries aligned to the requested period', async () => {
    const now = Date.now();
    const insertStoreOutcome = db.prepare('INSERT INTO store_roi_events (id, tenant_id, platform, event_type, external_id, revenue_usd, units, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

    insertStoreOutcome.run(`store-order-old-${now}`, tenantId, 'shopify', 'order_created', 'shopify-order-old', 999, 9, JSON.stringify({ id: 'shopify-order-old' }), now - 40 * 86_400_000);

    for (let index = 0; index < 25; index += 1) {
      insertStoreOutcome.run(
        `store-order-window-${index}-${now}`,
        tenantId,
        'shopify',
        'order_created',
        `shopify-order-window-${index}`,
        10,
        1,
        JSON.stringify({ id: `shopify-order-window-${index}` }),
        now - index * 86_400_000,
      );
    }

    const res = await app.request('/api/analytics/store-outcomes?period=30d&platform=shopify', {
      headers: { Authorization: authHeader },
    });

    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.summary.revenueUsd).toBe(439.75);

    const ordersInSeries = json.data.timeseries.reduce((sum: number, bucket: any) => sum + bucket.ordersCount, 0);
    expect(ordersInSeries).toBe(26);
  });
});