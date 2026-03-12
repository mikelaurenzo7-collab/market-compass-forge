/**
 * Webhook receiver routes for external platform events.
 *
 * These endpoints receive real-time events from connected platforms
 * (Shopify orders, exchange fills, social mentions) and dispatch them
 * to the appropriate bot runtime for immediate processing.
 *
 * Security: Each webhook validates its source via platform-specific
 * signature verification (HMAC). Unverified webhooks are rejected.
 */

import { Hono } from 'hono';
import crypto from 'crypto';
import { getDb } from '../lib/db.js';
import { logAudit } from '../lib/audit.js';

export const webhooksRouter = new Hono();

/* ─── Helpers ────────────────────────────────────────────────── */

/** Constant-time HMAC comparison to prevent timing attacks */
function verifyHmac(payload: string, signature: string, secret: string, algorithm = 'sha256'): boolean {
  const computed = crypto.createHmac(algorithm, secret).update(payload, 'utf8').digest('base64');
  const a = Buffer.from(signature);
  const b = Buffer.from(computed);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function safeJsonParse(raw: string): { ok: true; data: unknown } | { ok: false } {
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

/** Known platforms that may register dedicated webhook routes */
const KNOWN_PLATFORMS = new Set(['shopify', 'coinbase', 'alpaca', 'binance', 'kraken', 'etsy', 'amazon', 'square']);

// ─── Shopify Webhook ──────────────────────────────────────────

webhooksRouter.post('/shopify', async (c) => {
  const hmacHeader = c.req.header('x-shopify-hmac-sha256');
  const shopDomain = c.req.header('x-shopify-shop-domain');
  const topic = c.req.header('x-shopify-topic');

  if (!hmacHeader || !shopDomain || !topic) {
    return c.json({ success: false, error: 'Missing Shopify webhook headers' }, 400);
  }

  const rawBody = await c.req.text();

  // Look up the credential with this shop domain to get the webhook secret
  const db = getDb();
  const cred = db.prepare(
    `SELECT id, tenant_id, encrypted_data FROM credentials
     WHERE platform = 'shopify' AND account_label = ?`
  ).get(shopDomain) as { id: string; tenant_id: string; encrypted_data: string } | undefined;

  if (!cred) {
    return c.json({ success: false, error: 'Unknown shop domain' }, 404);
  }

  // Verify HMAC signature against the Shopify webhook signing secret
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] SHOPIFY_WEBHOOK_SECRET not configured');
    return c.json({ success: false, error: 'Webhook verification not configured' }, 500);
  }

  if (!verifyHmac(rawBody, hmacHeader, webhookSecret)) {
    logAudit({
      tenantId: cred.tenant_id,
      platform: 'shopify',
      action: 'webhook_rejected',
      result: 'blocked',
      riskLevel: 'high',
      details: JSON.stringify({ topic, shopDomain, reason: 'invalid_hmac' }),
    });
    return c.json({ success: false, error: 'Invalid signature' }, 401);
  }

  logAudit({
    tenantId: cred.tenant_id,
    platform: 'shopify',
    action: 'webhook_received',
    result: 'success',
    riskLevel: 'low',
    details: JSON.stringify({ topic, shopDomain, bodyLength: rawBody.length }),
  });

  // Parse and dispatch based on topic
  const parsed = safeJsonParse(rawBody);
  if (!parsed.ok) {
    return c.json({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  switch (topic) {
    case 'orders/create':
    case 'orders/updated':
    case 'orders/fulfilled':
    case 'products/update':
    case 'inventory_levels/update':
      db.prepare(
        `INSERT INTO webhook_events (tenant_id, platform, event_type, payload, created_at)
         VALUES (?, 'shopify', ?, ?, ?)`
      ).run(cred.tenant_id, topic, rawBody, Date.now());
      break;
    default:
      break;
  }

  return c.json({ success: true });
});

// ─── Coinbase Webhook ─────────────────────────────────────────

webhooksRouter.post('/coinbase', async (c) => {
  const signature = c.req.header('cb-signature');
  if (!signature) {
    return c.json({ success: false, error: 'Missing signature' }, 400);
  }

  const rawBody = await c.req.text();

  // Verify HMAC signature using Coinbase webhook signing secret
  const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] COINBASE_WEBHOOK_SECRET not configured');
    return c.json({ success: false, error: 'Webhook verification not configured' }, 500);
  }

  const computed = crypto.createHmac('sha256', webhookSecret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(computed);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return c.json({ success: false, error: 'Invalid signature' }, 401);
  }

  const parsed = safeJsonParse(rawBody);
  if (!parsed.ok) {
    return c.json({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  const payload = parsed.data as Record<string, unknown>;
  const db = getDb();

  const event = (payload.event ?? payload) as Record<string, unknown>;
  const eventType = (event.type as string) ?? 'unknown';

  // Resolve tenant from credential context
  const accountId = (event.account_id as string) || (event.user_id as string) || '';
  let tenantId = 'system';
  if (accountId) {
    const cred = db.prepare(
      `SELECT tenant_id FROM credentials WHERE platform = 'coinbase' AND account_label = ?`
    ).get(accountId) as { tenant_id: string } | undefined;
    if (cred) tenantId = cred.tenant_id;
  }

  db.prepare(
    `INSERT INTO webhook_events (tenant_id, platform, event_type, payload, created_at)
     VALUES (?, 'coinbase', ?, ?, ?)`
  ).run(tenantId, eventType, rawBody, Date.now());

  return c.json({ success: true });
});

// ─── Alpaca Webhook ───────────────────────────────────────────

webhooksRouter.post('/alpaca', async (c) => {
  // Alpaca uses a signing secret header for webhook verification
  const signature = c.req.header('alpaca-webhook-secret');
  const webhookSecret = process.env.ALPACA_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook] ALPACA_WEBHOOK_SECRET not configured');
    return c.json({ success: false, error: 'Webhook verification not configured' }, 500);
  }

  if (!signature || signature !== webhookSecret) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const rawBody = await c.req.text();
  const parsed = safeJsonParse(rawBody);
  if (!parsed.ok) {
    return c.json({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  const payload = parsed.data as Record<string, unknown>;
  const db = getDb();
  const eventType = (payload.event as string) ?? (payload.type as string) ?? 'trade_update';

  // Resolve tenant from account context
  const accountId = (payload.account_id as string) || '';
  let tenantId = 'system';
  if (accountId) {
    const cred = db.prepare(
      `SELECT tenant_id FROM credentials WHERE platform = 'alpaca' AND account_label = ?`
    ).get(accountId) as { tenant_id: string } | undefined;
    if (cred) tenantId = cred.tenant_id;
  }

  db.prepare(
    `INSERT INTO webhook_events (tenant_id, platform, event_type, payload, created_at)
     VALUES (?, 'alpaca', ?, ?, ?)`
  ).run(tenantId, eventType, rawBody, Date.now());

  return c.json({ success: true });
});

// ─── Generic Webhook (known platforms only) ──────────────────
// Requires a per-platform webhook secret passed as a bearer token.

webhooksRouter.post('/:platform', async (c) => {
  const platform = c.req.param('platform');

  // Only allow known platforms through the generic route
  if (!KNOWN_PLATFORMS.has(platform)) {
    return c.json({ success: false, error: 'Unknown platform' }, 404);
  }

  // Require a bearer token matching the platform webhook secret
  const authHeader = c.req.header('Authorization');
  const expectedSecret = process.env[`WEBHOOK_SECRET_${platform.toUpperCase()}`];

  if (!expectedSecret) {
    return c.json({ success: false, error: 'Webhook not configured for this platform' }, 404);
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || token !== expectedSecret) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const rawBody = await c.req.text();
  const parsed = safeJsonParse(rawBody);
  if (!parsed.ok) {
    return c.json({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  // Enforce a reasonable payload size (100KB for webhooks)
  if (rawBody.length > 102_400) {
    return c.json({ success: false, error: 'Payload too large' }, 413);
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO webhook_events (tenant_id, platform, event_type, payload, created_at)
     VALUES (?, ?, 'generic', ?, ?)`
  ).run('system', platform, rawBody, Date.now());

  return c.json({ success: true });
});
