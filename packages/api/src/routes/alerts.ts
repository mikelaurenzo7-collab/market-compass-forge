/**
 * Alert configuration API — CRUD for Twilio/WhatsApp alert recipients
 * and test alert dispatch.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { verifyAuthHeader } from '../lib/auth.js';
import { getDb } from '../lib/db.js';
import {
  getTwilioConfig,
  dispatchAlert,
  type AlertRecipient,
  type AlertChannel,
  type AlertEventType,
} from '@beastbots/shared';

export const alertsRouter = new Hono();

// ─── DB Schema Bootstrap ──────────────────────────────────────

let alertsTableInitialized = false;

function ensureAlertsTable() {
  if (alertsTableInitialized) return;
  const db = getDb();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS alert_recipients (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      channels TEXT NOT NULL DEFAULT '["sms"]',
      event_types TEXT NOT NULL DEFAULT '[]',
      min_priority TEXT NOT NULL DEFAULT 'medium',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `).run();
  alertsTableInitialized = true;
}

// Lazy init — called on first request rather than module load
alertsRouter.use('*', async (_c, next) => {
  ensureAlertsTable();
  await next();
});

// ─── Validation ───────────────────────────────────────────────

const channelSchema = z.enum(['sms', 'whatsapp']);
const eventSchema = z.enum([
  'circuit_breaker_tripped',
  'trade_executed',
  'approval_required',
  'budget_warning',
  'bot_error',
  'liquidation_risk',
  'daily_summary',
]);
const prioritySchema = z.enum(['critical', 'high', 'medium', 'low']);

const createRecipientSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be E.164 format'),
  channels: z.array(channelSchema).min(1).default(['sms']),
  eventTypes: z.array(eventSchema).default([]),
  minPriority: prioritySchema.default('medium'),
});

const updateRecipientSchema = createRecipientSchema.partial();

// ─── Helpers ──────────────────────────────────────────────────

function rowToRecipient(row: Record<string, unknown>): AlertRecipient {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    userId: row.user_id as string,
    phone: row.phone as string,
    channels: JSON.parse(row.channels as string) as AlertChannel[],
    eventTypes: JSON.parse(row.event_types as string) as AlertEventType[],
    minPriority: row.min_priority as AlertRecipient['minPriority'],
    enabled: (row.enabled as number) === 1,
    createdAt: row.created_at as number,
  };
}

// ─── Routes ───────────────────────────────────────────────────

// List all alert recipients for the tenant
alertsRouter.get('/recipients', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM alert_recipients WHERE tenant_id = ? AND enabled = 1 ORDER BY created_at DESC',
  ).all(auth.tenantId) as Record<string, unknown>[];

  return c.json({
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      channels: JSON.parse(r.channels as string),
      eventTypes: JSON.parse(r.event_types as string),
      minPriority: r.min_priority,
      createdAt: r.created_at,
    })),
  });
});

// Add a new alert recipient
alertsRouter.post('/recipients', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = createRecipientSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
  }

  const id = `ar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();

  getDb().prepare(`
    INSERT INTO alert_recipients (id, tenant_id, user_id, name, phone, channels, event_types, min_priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    auth.tenantId,
    auth.userId,
    parsed.data.name,
    parsed.data.phone,
    JSON.stringify(parsed.data.channels),
    JSON.stringify(parsed.data.eventTypes),
    parsed.data.minPriority,
    now,
    now,
  );

  return c.json({ success: true, data: { id } }, 201);
});

// Update an alert recipient
alertsRouter.patch('/recipients/:id', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const recipientId = c.req.param('id');
  const existing = getDb().prepare(
    'SELECT * FROM alert_recipients WHERE id = ? AND tenant_id = ?',
  ).get(recipientId, auth.tenantId) as Record<string, unknown> | undefined;

  if (!existing) return c.json({ success: false, error: 'Recipient not found' }, 404);

  const body = await c.req.json();
  const parsed = updateRecipientSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.name !== undefined) { updates.push('name = ?'); values.push(parsed.data.name); }
  if (parsed.data.phone !== undefined) { updates.push('phone = ?'); values.push(parsed.data.phone); }
  if (parsed.data.channels !== undefined) { updates.push('channels = ?'); values.push(JSON.stringify(parsed.data.channels)); }
  if (parsed.data.eventTypes !== undefined) { updates.push('event_types = ?'); values.push(JSON.stringify(parsed.data.eventTypes)); }
  if (parsed.data.minPriority !== undefined) { updates.push('min_priority = ?'); values.push(parsed.data.minPriority); }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(recipientId, auth.tenantId);
    getDb().prepare(
      `UPDATE alert_recipients SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
    ).run(...values);
  }

  return c.json({ success: true });
});

// Delete an alert recipient (soft-delete)
alertsRouter.delete('/recipients/:id', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const recipientId = c.req.param('id');
  const result = getDb().prepare(
    'UPDATE alert_recipients SET enabled = 0, updated_at = ? WHERE id = ? AND tenant_id = ?',
  ).run(Date.now(), recipientId, auth.tenantId);

  if (result.changes === 0) return c.json({ success: false, error: 'Recipient not found' }, 404);
  return c.json({ success: true });
});

// Send a test alert
alertsRouter.post('/test', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const twilioConfig = getTwilioConfig();
  if (!twilioConfig) {
    return c.json({ success: false, error: 'Twilio not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)' }, 503);
  }

  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM alert_recipients WHERE tenant_id = ? AND enabled = 1',
  ).all(auth.tenantId) as Record<string, unknown>[];

  if (rows.length === 0) {
    return c.json({ success: false, error: 'No alert recipients configured' }, 400);
  }

  const recipients: AlertRecipient[] = rows.map(rowToRecipient);

  const results = await dispatchAlert(
    twilioConfig,
    recipients,
    'daily_summary',
    '🧪 Test alert from BeastBots — your alert pipeline is working!',
  );

  return c.json({ success: true, data: { sent: results.length } });
});

// Get alert status (Twilio config check)
alertsRouter.get('/status', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const twilioConfig = getTwilioConfig();
  const db = getDb();
  const recipientCount = (db.prepare(
    'SELECT COUNT(*) as count FROM alert_recipients WHERE tenant_id = ? AND enabled = 1',
  ).get(auth.tenantId) as { count: number })?.count ?? 0;

  return c.json({
    success: true,
    data: {
      twilioConfigured: !!twilioConfig,
      recipientCount,
      channels: twilioConfig ? {
        sms: !!twilioConfig.fromNumber,
        whatsapp: !!twilioConfig.fromWhatsApp,
      } : { sms: false, whatsapp: false },
    },
  });
});
