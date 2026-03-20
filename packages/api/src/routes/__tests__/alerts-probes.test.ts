import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { signAccessToken } from '../../lib/auth.js';
import { closeDb, getDb } from '../../lib/db.js';

const tmpDb = path.join(
  os.tmpdir(),
  `beastbots-alerts-probes-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes!';
process.env.NODE_ENV = 'test';

import app from '../../server.js';

const testUserId = 'user-alerts-test';
const testTenantId = 'tenant-alerts-test';
let authHeader = '';

function clearRateLimits() {
  const db = getDb();
  db.prepare('DELETE FROM rate_limits').run();
}

describe('alerts + probe regression coverage', () => {
  beforeAll(async () => {
    const db = getDb();
    const now = Date.now();

    db.prepare(
      'INSERT OR IGNORE INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(testUserId, 'alerts-test@example.com', 'hash', 'Alerts Test', now, now);
    db.prepare(
      'INSERT OR IGNORE INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(testTenantId, 'Alerts Tenant', testUserId, 'starter', now);
    db.prepare(
      'INSERT OR IGNORE INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)',
    ).run(testTenantId, testUserId, 'owner');

    const token = await signAccessToken({
      userId: testUserId,
      tenantId: testTenantId,
      email: 'alerts-test@example.com',
    });
    authHeader = `Bearer ${token}`;
  });

  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch {
      // ignore cleanup failures in ephemeral test DBs
    }
  });

  it('serves Cloud Run probe endpoints without auth', async () => {
    clearRateLimits();

    const healthz = await app.request('/healthz');
    expect(healthz.status).toBe(200);
    await expect(healthz.json()).resolves.toEqual({ status: 'ok' });

    const readyz = await app.request('/readyz');
    expect(readyz.status).toBe(200);
    await expect(readyz.json()).resolves.toEqual({ status: 'ready' });
  });

  it('excludes /healthz from global rate limiting', async () => {
    clearRateLimits();

    for (let i = 0; i < 105; i += 1) {
      const res = await app.request('/healthz');
      expect(res.status).toBe(200);
    }

    const root = await app.request('/');
    expect(root.status).toBe(200);
  });

  it('falls back to safe defaults when alert recipient JSON is malformed', async () => {
    clearRateLimits();

    // Trigger lazy table initialization in alerts router.
    await app.request('/api/alerts/recipients', { headers: { Authorization: authHeader } });

    const db = getDb();
    const now = Date.now();
    db.prepare(`
      INSERT INTO alert_recipients (id, tenant_id, user_id, name, phone, channels, event_types, min_priority, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      'ar_malformed_list',
      testTenantId,
      testUserId,
      'Malformed Recipient',
      '+15555550123',
      'not-json',
      '{broken',
      'medium',
      now,
      now,
    );

    const res = await app.request('/api/alerts/recipients', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: Array<{ id: string; channels: string[]; eventTypes: string[] }>;
    };

    const malformed = body.data.find((r) => r.id === 'ar_malformed_list');
    expect(malformed).toBeDefined();
    expect(malformed?.channels).toEqual(['sms']);
    expect(malformed?.eventTypes).toEqual([]);
  });

  it('uses fallback channels during test alert dispatch when channels JSON is invalid', async () => {
    clearRateLimits();

    const db = getDb();
    const now = Date.now();
    db.prepare(`
      INSERT INTO alert_recipients (id, tenant_id, user_id, name, phone, channels, event_types, min_priority, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      'ar_malformed_dispatch',
      testTenantId,
      testUserId,
      'Malformed Dispatch Recipient',
      '+15555550124',
      'definitely-not-json',
      '["daily_summary"]',
      'low',
      now,
      now,
    );

    process.env.TWILIO_ACCOUNT_SID = 'AC_test_sid';
    process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
    process.env.TWILIO_FROM_NUMBER = '+15555550000';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sid: 'SM_test_sid' }),
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const res = await app.request('/api/alerts/test', {
        method: 'POST',
        headers: { Authorization: authHeader },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean; data: { sent: number } };
      expect(body.success).toBe(true);
      expect(body.data.sent).toBe(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
