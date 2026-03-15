import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { signAccessToken } from '../../lib/auth.js';

const tmpDb = path.join(os.tmpdir(), `beastbots-alerts-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';
process.env.NODE_ENV = 'test';

import app from '../../server.js';
import { closeDb, getDb } from '../../lib/db.js';

describe('alerts routes', () => {
  let userId: string;
  let tenantId: string;
  let authHeader: string;

  beforeAll(async () => {
    const db = getDb();
    userId = `alerts-user-${Date.now()}`;
    tenantId = `alerts-tenant-${Date.now()}`;
    const now = Date.now();

    db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, 'alerts@example.com', 'hash', 'Alerts User', now, now);
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(tenantId, 'Alerts Tenant', userId, 'starter', now);
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
      .run(tenantId, userId, 'owner');

    const token = await signAccessToken({ userId, tenantId, email: 'alerts@example.com' });
    authHeader = `Bearer ${token}`;

    // Trigger lazy table bootstrap via router middleware.
    await app.request('/api/alerts/recipients', { headers: { Authorization: authHeader } });
  });

  beforeEach(() => {
    const db = getDb();
    db.prepare('DELETE FROM alert_recipients').run();
    db.prepare('DELETE FROM rate_limits').run();
  });

  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch {
      // ignore cleanup errors in tests
    }
  });

  it('falls back to safe defaults when malformed recipient JSON is read from DB', async () => {
    const db = getDb();
    const recipientId = `ar-${Date.now()}`;
    const now = Date.now();
    db.prepare(`
      INSERT INTO alert_recipients
      (id, tenant_id, user_id, name, phone, channels, event_types, min_priority, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      recipientId,
      tenantId,
      userId,
      'Malformed Recipient',
      '+15555550123',
      '{"broken"',
      'not-json',
      'medium',
      1,
      now,
      now,
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const res = await app.request('/api/alerts/recipients', {
        headers: { Authorization: authHeader },
      });

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: Array<{ id: string; channels: string[]; eventTypes: string[] }> };
      expect(json.success).toBe(true);
      const saved = json.data.find((r) => r.id === recipientId);
      expect(saved).toBeDefined();
      expect(saved?.channels).toEqual(['sms']);
      expect(saved?.eventTypes).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('handles malformed recipient JSON in /api/alerts/test without crashing', async () => {
    const db = getDb();
    const recipientId = `ar-${Date.now()}`;
    const now = Date.now();
    db.prepare(`
      INSERT INTO alert_recipients
      (id, tenant_id, user_id, name, phone, channels, event_types, min_priority, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      recipientId,
      tenantId,
      userId,
      'Malformed Recipient',
      '+15555550999',
      '{"broken"',
      'not-json',
      'medium',
      1,
      now,
      now,
    );

    const prevSid = process.env.TWILIO_ACCOUNT_SID;
    const prevToken = process.env.TWILIO_AUTH_TOKEN;
    const prevFrom = process.env.TWILIO_FROM_NUMBER;

    process.env.TWILIO_ACCOUNT_SID = 'test-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    process.env.TWILIO_FROM_NUMBER = '+15555550000';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn();
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const res = await app.request('/api/alerts/test', {
        method: 'POST',
        headers: { Authorization: authHeader },
      });

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { sent: number } };
      expect(json.success).toBe(true);
      expect(json.data.sent).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      global.fetch = originalFetch;
      if (prevSid === undefined) delete process.env.TWILIO_ACCOUNT_SID;
      else process.env.TWILIO_ACCOUNT_SID = prevSid;
      if (prevToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
      else process.env.TWILIO_AUTH_TOKEN = prevToken;
      if (prevFrom === undefined) delete process.env.TWILIO_FROM_NUMBER;
      else process.env.TWILIO_FROM_NUMBER = prevFrom;
    }
  });
});
