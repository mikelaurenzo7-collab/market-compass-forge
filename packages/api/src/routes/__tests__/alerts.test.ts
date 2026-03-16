import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const tmpDb = path.join(os.tmpdir(), `beastbots-alerts-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';
process.env.NODE_ENV = 'test';
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? 'AC_test';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? 'auth_test';
process.env.TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? '+15555550100';

import app from '../../server.js';
import { signAccessToken } from '../../lib/auth.js';
import { closeDb, getDb } from '../../lib/db.js';

function clearRateLimits() {
  const db = getDb();
  db.prepare('DELETE FROM rate_limits').run();
}

describe('alerts route JSON parsing hardening', () => {
  const userId = 'user-alerts-test';
  const tenantId = 'tenant-alerts-test';
  let authHeader = '';

  beforeAll(async () => {
    const db = getDb();
    const now = Date.now();

    db.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(userId, 'alerts-test@example.com', 'hash', 'Alerts Test User', now, now);
    db.prepare(
      'INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(tenantId, 'Alerts Tenant', userId, 'starter', now);
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)').run(tenantId, userId, 'owner');

    const token = await signAccessToken({ userId, tenantId, email: 'alerts-test@example.com' });
    authHeader = `Bearer ${token}`;

    // Triggers lazy schema bootstrap for alert_recipients.
    await app.request('/api/alerts/recipients', { headers: { Authorization: authHeader } });
  });

  beforeEach(() => {
    const db = getDb();
    db.prepare('DELETE FROM alert_recipients').run();
    clearRateLimits();
  });

  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch {
      // ignore cleanup errors in tests
    }
  });

  it('falls back to safe defaults when recipient JSON fields are malformed', async () => {
    const db = getDb();
    const now = Date.now();
    db.prepare(`
      INSERT INTO alert_recipients
      (id, tenant_id, user_id, name, phone, channels, event_types, min_priority, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ar_malformed_1',
      tenantId,
      userId,
      'Malformed Recipient',
      '+15555550111',
      '{"broken"',
      'not-valid-json',
      'high',
      1,
      now,
      now,
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await app.request('/api/alerts/recipients', {
      headers: { Authorization: authHeader },
    });
    const body = await res.json() as {
      success: boolean;
      data: Array<{ channels: string[]; eventTypes: string[] }>;
    };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.channels).toEqual(['sms']);
    expect(body.data[0]?.eventTypes).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it('does not throw in test dispatch flow when stored recipient JSON is malformed', async () => {
    const db = getDb();
    const now = Date.now();
    db.prepare(`
      INSERT INTO alert_recipients
      (id, tenant_id, user_id, name, phone, channels, event_types, min_priority, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ar_malformed_2',
      tenantId,
      userId,
      'Malformed Dispatch Recipient',
      '+15555550112',
      '{bad-json',
      '{"also":"bad"',
      'medium',
      1,
      now,
      now,
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await app.request('/api/alerts/test', {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    const body = await res.json() as {
      success: boolean;
      data: { sent: number };
    };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.sent).toBe(0);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});
