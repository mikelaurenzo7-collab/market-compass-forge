import { Hono } from 'hono';
import { z } from 'zod';
import { verifyAuthHeader } from '../lib/auth.js';
import { getDb } from '../lib/db.js';
import {
  type PushPreferences,
  createDefaultPushPreferences,
  shouldSendPush,
  type PushPayload,
  type PushEventType,
} from '@beastbots/shared';

export const pushRouter = new Hono();

// ─── DB row types ─────────────────────────────────────────────
interface SubRow { id: string; tenant_id: string; user_id: string; endpoint: string; p256dh: string; auth: string; user_agent: string; created_at: number; last_used_at: number }
interface PrefRow { preferences: string }

// ─── POST /api/push/subscribe ──────────────────────────────────
const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  userAgent: z.string().max(512).optional(),
});

pushRouter.post('/subscribe', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues }, 400);

  // Validate endpoint is a known push service (SSRF protection)
  if (!isAllowedPushEndpoint(parsed.data.endpoint)) {
    return c.json({ success: false, error: 'Invalid push endpoint — must be a known push service' }, 400);
  }

  const db = getDb();
  const now = Date.now();
  const id = `psub_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // Upsert by endpoint (one subscription per browser)
  db.prepare(`
    INSERT INTO push_subscriptions (id, tenant_id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = ?, auth = ?, user_agent = ?, last_used_at = ?
  `).run(
    id, auth.tenantId, auth.userId, parsed.data.endpoint, parsed.data.keys.p256dh, parsed.data.keys.auth,
    parsed.data.userAgent ?? '', now, now,
    parsed.data.keys.p256dh, parsed.data.keys.auth, parsed.data.userAgent ?? '', now,
  );

  return c.json({ success: true, data: { id } });
});

// ─── DELETE /api/push/unsubscribe ──────────────────────────────
pushRouter.delete('/unsubscribe', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null;
  if (!endpoint) return c.json({ success: false, error: 'endpoint required' }, 400);

  const db = getDb();
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').run(endpoint, auth.userId);

  return c.json({ success: true });
});

// ─── GET /api/push/subscriptions ───────────────────────────────
pushRouter.get('/subscriptions', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const rows = db.prepare(
    'SELECT id, user_agent, created_at, last_used_at FROM push_subscriptions WHERE user_id = ? ORDER BY last_used_at DESC'
  ).all(auth.userId) as { id: string; user_agent: string; created_at: number; last_used_at: number }[];

  return c.json({ success: true, data: rows });
});

// ─── GET /api/push/preferences ─────────────────────────────────
pushRouter.get('/preferences', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const row = db.prepare('SELECT preferences FROM push_preferences WHERE user_id = ?').get(auth.userId) as PrefRow | undefined;

  if (!row) return c.json({ success: true, data: createDefaultPushPreferences() });
  return c.json({ success: true, data: JSON.parse(row.preferences) as PushPreferences });
});

// ─── PUT /api/push/preferences ─────────────────────────────────
const prefsSchema = z.object({
  approvalRequired: z.boolean(),
  tradeExecuted: z.boolean(),
  circuitBreakerTripped: z.boolean(),
  budgetWarning: z.boolean(),
  botError: z.boolean(),
  dailyDigest: z.boolean(),
});

pushRouter.put('/preferences', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues }, 400);

  const db = getDb();
  const now = Date.now();
  db.prepare(`
    INSERT INTO push_preferences (user_id, preferences, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET preferences = ?, updated_at = ?
  `).run(auth.userId, JSON.stringify(parsed.data), now, JSON.stringify(parsed.data), now);

  return c.json({ success: true });
});

// ─── POST /api/push/send (internal) ───────────────────────────
// Sends a push notification to all subscriptions for a tenant.
// Called internally by the bot runtime when events occur.

const PUSH_EVENT_TYPES: PushEventType[] = [
  'approval_required', 'trade_executed', 'circuit_breaker_tripped',
  'budget_warning', 'bot_error', 'daily_digest',
];

/** Only allow push to known Web Push service endpoints (SSRF protection) */
const ALLOWED_PUSH_DOMAINS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'wns.windows.com',
  'web.push.apple.com',
  'push.apple.com',
];

function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:') return false;
    return ALLOWED_PUSH_DOMAINS.some(d => url.hostname === d || url.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

const sendSchema = z.object({
  eventType: z.enum(PUSH_EVENT_TYPES as [PushEventType, ...PushEventType[]]),
  payload: z.object({
    title: z.string().max(200),
    body: z.string().max(500),
    tag: z.string().max(100).optional(),
    data: z.record(z.unknown()).optional(),
  }),
});

pushRouter.post('/send', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues }, 400);

  const { eventType, payload } = parsed.data;

  const db = getDb();

  // Get all subscriptions for this tenant
  const subs = db.prepare(
    'SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE tenant_id = ?'
  ).all(auth.tenantId) as SubRow[];

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    return c.json({ success: true, data: { sent: 0, skipped: subs.length, reason: 'VAPID keys not configured' } });
  }

  let sent = 0;
  let skipped = 0;

  for (const sub of subs) {
    // Check user preferences
    const prefRow = db.prepare('SELECT preferences FROM push_preferences WHERE user_id = ?').get(sub.user_id) as PrefRow | undefined;
    const prefs: PushPreferences = prefRow ? JSON.parse(prefRow.preferences) : createDefaultPushPreferences();

    if (!shouldSendPush(eventType, prefs)) {
      skipped++;
      continue;
    }

    // Send via Web Push protocol
    try {
      // SSRF protection: only allow known push service endpoints
      if (!isAllowedPushEndpoint(sub.endpoint)) {
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
        skipped++;
        continue;
      }

      const pushPayload = JSON.stringify(payload);
      // In production, use the web-push library here.
      // For now, record the attempt and log it.
      const res = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'TTL': '86400',
        },
        body: pushPayload,
      });

      if (res.ok || res.status === 201) {
        sent++;
        db.prepare('UPDATE push_subscriptions SET last_used_at = ? WHERE id = ?').run(Date.now(), sub.id);
      } else if (res.status === 404 || res.status === 410) {
        // Subscription expired — clean up
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
        skipped++;
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  return c.json({ success: true, data: { sent, skipped } });
});

// ─── GET /api/push/vapid-key ───────────────────────────────────
// Returns the public VAPID key for the client to subscribe
pushRouter.get('/vapid-key', async (c) => {
  const key = process.env.VAPID_PUBLIC_KEY ?? '';
  return c.json({ success: true, data: { vapidPublicKey: key } });
});
