import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Isolated temp database
const tmpDb = path.join(os.tmpdir(), `beastbots-test-sprint2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes!';
process.env.SHOPIFY_WEBHOOK_SECRET = 'shopify-test-secret';
process.env.COINBASE_WEBHOOK_SECRET = 'coinbase-test-secret';
process.env.ALPACA_WEBHOOK_SECRET = 'alpaca-test-secret';
process.env.WEBHOOK_SECRET_ETSY = 'etsy-test-secret';

import app from '../../server';
import { getDb, closeDb } from '../../lib/db';
import { signAccessToken } from '../../lib/auth';
import { passwordResetEmail, tradeAlertEmail, dailyDigestEmail, sendEmail } from '../notifications';

// ─── Setup ────────────────────────────────────────────────────

let db: ReturnType<typeof getDb>;
let userId: string;
let tenantId: string;
let authHeader: string;

beforeAll(async () => {
  db = getDb();
  userId = `user-s2-${Date.now()}`;
  tenantId = `tenant-s2-${Date.now()}`;
  const now = Date.now();
  db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, 'sprint2@example.com', 'hash', 'Sprint2 Tester', now, now);
  db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(tenantId, 'Sprint2 Tenant', userId, 'starter', now);
  db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
    .run(tenantId, userId, 'owner');

  const tok = await signAccessToken({ userId, tenantId, email: 'sprint2@example.com' });
  authHeader = `Bearer ${tok}`;
});

afterAll(() => {
  closeDb();
});

// ────────────────────────────────────────────────────────────────
// Templates API
// ────────────────────────────────────────────────────────────────

describe('Templates API', () => {
  it('GET /api/templates returns all templates', async () => {
    const res = await app.request('/api/templates');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(14);
  });

  it('filters by family=trading', async () => {
    const res = await app.request('/api/templates?family=trading');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBe(5);
    expect(json.data.every((t: any) => t.family === 'trading')).toBe(true);
  });

  it('filters by family=store', async () => {
    const res = await app.request('/api/templates?family=store');
    const json = await res.json();
    expect(json.data.length).toBe(3);
  });

  it('filters by difficulty=beginner', async () => {
    const res = await app.request('/api/templates?difficulty=beginner');
    const json = await res.json();
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data.every((t: any) => t.difficulty === 'beginner')).toBe(true);
  });

  it('filters by platform=coinbase', async () => {
    const res = await app.request('/api/templates?platform=coinbase');
    const json = await res.json();
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data.every((t: any) => t.platforms.includes('coinbase'))).toBe(true);
  });

  it('combines family + difficulty filters', async () => {
    const res = await app.request('/api/templates?family=trading&difficulty=beginner');
    const json = await res.json();
    expect(json.data.every((t: any) => t.family === 'trading' && t.difficulty === 'beginner')).toBe(true);
  });

  it('GET /api/templates/:id returns single template', async () => {
    const res = await app.request('/api/templates/btc-dca-weekly');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('btc-dca-weekly');
    expect(json.data.name).toBe('Bitcoin Weekly DCA');
  });

  it('GET /api/templates/:id returns 404 for unknown', async () => {
    const res = await app.request('/api/templates/does-not-exist');
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────
// Webhooks API
// ────────────────────────────────────────────────────────────────

describe('Webhooks API', () => {
  it('POST /api/webhooks/shopify rejects missing headers', async () => {
    const res = await app.request('/api/webhooks/shopify', {
      method: 'POST',
      body: JSON.stringify({ test: true }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Missing Shopify webhook headers');
  });

  it('POST /api/webhooks/shopify rejects unknown shop domain', async () => {
    const res = await app.request('/api/webhooks/shopify', {
      method: 'POST',
      body: JSON.stringify({ order: { id: 1 } }),
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': 'somesig',
        'x-shopify-shop-domain': 'unknown-shop.myshopify.com',
        'x-shopify-topic': 'orders/create',
      },
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('Unknown shop domain');
  });

  it('POST /api/webhooks/shopify accepts webhook from known shop', async () => {
    // First insert a credential for the shop
    const now = Date.now();
    db.prepare(
      `INSERT INTO credentials (id, tenant_id, platform, account_label, credential_type, encrypted_data, status, created_at, updated_at)
       VALUES (?, ?, 'shopify', ?, 'api_key', '{}', 'active', ?, ?)`
    ).run(`cred-shop-${now}`, tenantId, 'test-shop.myshopify.com', now, now);

    const body = JSON.stringify({ id: 123, total_price: '49.99', line_items: [{ quantity: 2 }, { quantity: 1 }] });
    const hmac = crypto.createHmac('sha256', 'shopify-test-secret').update(body, 'utf8').digest('base64');

    const res = await app.request('/api/webhooks/shopify', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': hmac,
        'x-shopify-shop-domain': 'test-shop.myshopify.com',
        'x-shopify-topic': 'orders/create',
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify webhook event was stored
    const event = db.prepare(
      "SELECT * FROM webhook_events WHERE platform = 'shopify' AND event_type = 'orders/create'"
    ).get() as any;
    expect(event).toBeDefined();
    expect(event.tenant_id).toBe(tenantId);

    const roiEvent = db.prepare(
      "SELECT * FROM store_roi_events WHERE platform = 'shopify' AND event_type = 'order_created' AND external_id = '123'"
    ).get() as any;
    expect(roiEvent).toBeDefined();
    expect(roiEvent.tenant_id).toBe(tenantId);
    expect(roiEvent.revenue_usd).toBe(49.99);
    expect(roiEvent.units).toBe(3);
  });

  it('POST /api/webhooks/shopify records inventory stockout outcomes', async () => {
    const body = JSON.stringify({ inventory_item_id: 'sku-123', location_id: 'loc-1', available: 0 });
    const hmac = crypto.createHmac('sha256', 'shopify-test-secret').update(body, 'utf8').digest('base64');

    const res = await app.request('/api/webhooks/shopify', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': hmac,
        'x-shopify-shop-domain': 'test-shop.myshopify.com',
        'x-shopify-topic': 'inventory_levels/update',
      },
    });
    expect(res.status).toBe(200);

    const roiEvent = db.prepare(
      "SELECT * FROM store_roi_events WHERE platform = 'shopify' AND event_type = 'inventory_stockout'"
    ).get() as any;
    expect(roiEvent).toBeDefined();
    expect(roiEvent.tenant_id).toBe(tenantId);
  });

  it('POST /api/webhooks/coinbase rejects missing signature', async () => {
    const res = await app.request('/api/webhooks/coinbase', {
      method: 'POST',
      body: JSON.stringify({ event: { type: 'fill' } }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Missing signature');
  });

  it('POST /api/webhooks/coinbase stores event', async () => {
    const body = JSON.stringify({ event: { type: 'trade_completed', user_id: 'u1' } });
    const sig = crypto.createHmac('sha256', 'coinbase-test-secret').update(body, 'utf8').digest('hex');

    const res = await app.request('/api/webhooks/coinbase', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'cb-signature': sig,
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('POST /api/webhooks/alpaca stores trade update', async () => {
    const res = await app.request('/api/webhooks/alpaca', {
      method: 'POST',
      body: JSON.stringify({ event: 'fill', order: { symbol: 'AAPL', qty: 10 } }),
      headers: {
        'Content-Type': 'application/json',
        'alpaca-webhook-secret': 'alpaca-test-secret',
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const event = db.prepare(
      "SELECT * FROM webhook_events WHERE platform = 'alpaca'"
    ).get() as any;
    expect(event).toBeDefined();
  });

  it('POST /api/webhooks/:platform stores generic event', async () => {
    const res = await app.request('/api/webhooks/etsy', {
      method: 'POST',
      body: JSON.stringify({ type: 'listing.updated' }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer etsy-test-secret',
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const event = db.prepare(
      "SELECT * FROM webhook_events WHERE platform = 'etsy'"
    ).get() as any;
    expect(event).toBeDefined();
    expect(event.event_type).toBe('generic');
  });
});

// ────────────────────────────────────────────────────────────────
// Notification Preferences API
// ────────────────────────────────────────────────────────────────

describe('Notification Preferences API', () => {
  it('GET /api/notifications/preferences returns defaults when none set', async () => {
    const res = await app.request('/api/notifications/preferences', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.emailTradeAlerts).toBe(true);
    expect(json.data.emailDailyDigest).toBe(true);
    expect(json.data.emailSecurityAlerts).toBe(true);
    expect(json.data.emailWeeklyReport).toBe(false);
    expect(json.data.tradeAlertMinConfidence).toBe(80);
  });

  it('GET /api/notifications/preferences rejects unauthenticated', async () => {
    const res = await app.request('/api/notifications/preferences');
    expect(res.status).toBe(401);
  });

  it('PUT /api/notifications/preferences saves preferences', async () => {
    const prefs = {
      emailTradeAlerts: false,
      emailDailyDigest: true,
      emailSecurityAlerts: true,
      emailWeeklyReport: true,
      tradeAlertMinConfidence: 90,
      tradeAlertMinPnlUsd: 25,
    };

    const res = await app.request('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify persisted
    const getRes = await app.request('/api/notifications/preferences', {
      headers: { Authorization: authHeader },
    });
    const savedJson = await getRes.json();
    expect(savedJson.data.emailTradeAlerts).toBe(false);
    expect(savedJson.data.emailWeeklyReport).toBe(true);
    expect(savedJson.data.tradeAlertMinConfidence).toBe(90);
  });

  it('PUT /api/notifications/preferences upserts on re-save', async () => {
    // Save once
    await app.request('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ emailTradeAlerts: true }),
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    });

    // Save again with different value
    await app.request('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ emailTradeAlerts: false }),
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    });

    const res = await app.request('/api/notifications/preferences', {
      headers: { Authorization: authHeader },
    });
    const json = await res.json();
    expect(json.data.emailTradeAlerts).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────
// Email Templates (unit)
// ────────────────────────────────────────────────────────────────

describe('Email Templates', () => {
  it('passwordResetEmail generates valid HTML with resetUrl', () => {
    const email = passwordResetEmail('https://beastbots.com/reset?token=abc');
    expect(email.subject).toContain('Reset');
    expect(email.html).toContain('https://beastbots.com/reset?token=abc');
    expect(email.html).toContain('Password Reset');
  });

  it('tradeAlertEmail includes bot name, action, and symbol', () => {
    const email = tradeAlertEmail('My BTC Bot', 'BUY', 'BTC-USD', 'Momentum signal at 68k');
    expect(email.subject).toContain('My BTC Bot');
    expect(email.subject).toContain('BUY');
    expect(email.subject).toContain('BTC-USD');
    expect(email.html).toContain('BUY');
    expect(email.html).toContain('BTC-USD');
    expect(email.html).toContain('Momentum signal at 68k');
  });

  it('dailyDigestEmail formats P&L with correct sign', () => {
    const positive = dailyDigestEmail({
      totalBots: 5, activeBots: 3, totalPnl: 142.50, successRate: 72, highlights: ['ETH up 5%'],
    });
    expect(positive.subject).toContain('+$142.50');
    expect(positive.html).toContain('+$142.50');
    expect(positive.html).toContain('ETH up 5%');

    const negative = dailyDigestEmail({
      totalBots: 2, activeBots: 1, totalPnl: -38.25, successRate: 40, highlights: [],
    });
    expect(negative.subject).toContain('$-38.25');
  });

  it('sendEmail returns { success: false } without RESEND_API_KEY', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({ to: 'test@example.com', subject: 'Test', html: '<p>hi</p>' });
    expect(result.success).toBe(false);
  });
});
