import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../../lib/db.js';
import { signAccessToken } from '../../lib/auth.js';

const tmpDb = path.join(
  os.tmpdir(),
  `beastbots-test-alerts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? 'AC_test_sid';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? 'test_auth_token';
process.env.TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? '+15555550000';

import app from '../../server.js';

describe('alerts route JSON fallback handling', () => {
  let authHeader: string;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    const db = getDb();
    userId = `user-alerts-${Date.now()}`;
    tenantId = `tenant-alerts-${Date.now()}`;
    const now = Date.now();

    db.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(userId, 'alerts-test@example.com', 'hash', 'Alerts Tester', now, now);
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)').run(
      tenantId,
      'Alerts Tenant',
      userId,
      'starter',
      now,
    );
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)').run(tenantId, userId, 'owner');

    const token = await signAccessToken({ userId, tenantId, email: 'alerts-test@example.com' });
    authHeader = `Bearer ${token}`;

    // Trigger lazy table creation middleware before direct inserts in tests.
    const statusRes = await app.request('/api/alerts/status', { headers: { Authorization: authHeader } });
    expect(statusRes.status).toBe(200);
  });

  afterAll(() => {
    closeDb();
  });

  function seedMalformedRecipient() {
    const db = getDb();
    db.prepare('DELETE FROM alert_recipients WHERE tenant_id = ?').run(tenantId);

    const now = Date.now();
    db.prepare(`
      INSERT INTO alert_recipients (
        id, tenant_id, user_id, name, phone, channels, event_types, min_priority, enabled, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ar_bad_${now}`,
      tenantId,
      userId,
      'On-call',
      '+15555550123',
      '{bad json',
      '{also bad',
      'medium',
      1,
      now,
      now,
    );
  }

  it('falls back to safe defaults on malformed JSON in recipient list', async () => {
    seedMalformedRecipient();

    const res = await app.request('/api/alerts/recipients', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].channels).toEqual(['sms']);
    expect(json.data[0].eventTypes).toEqual([]);
  });

  it('does not crash test dispatch when recipient JSON columns are malformed', async () => {
    seedMalformedRecipient();

    const res = await app.request('/api/alerts/test', {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.sent).toBe(0);
  });
});
