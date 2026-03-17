import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDb, closeDb } from '../../lib/db.js';
import { signAccessToken } from '../../lib/auth.js';

const tmpDb = path.join(
  os.tmpdir(),
  `beastbots-alerts-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';
process.env.NODE_ENV = 'test';

import app from '../../server.js';

describe('alerts routes', () => {
  let authHeader: string;
  let userId: string;
  let tenantId: string;

  beforeAll(async () => {
    const db = getDb();
    userId = `user-alerts-${Date.now()}`;
    tenantId = `tenant-alerts-${Date.now()}`;
    const now = Date.now();

    db.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(userId, 'alerts-test@example.com', 'hash', 'Alerts Tester', now, now);
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(tenantId, 'Alerts Tenant', userId, 'starter', now);
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
      .run(tenantId, userId, 'owner');

    const token = await signAccessToken({ userId, tenantId, email: 'alerts-test@example.com' });
    authHeader = `Bearer ${token}`;
  });

  afterAll(() => {
    closeDb();
  });

  it('falls back to safe defaults when recipient JSON columns are malformed', async () => {
    const db = getDb();
    db.prepare('DELETE FROM rate_limits').run();

    // First request triggers lazy alert table creation middleware.
    const bootstrap = await app.request('/api/alerts/recipients', {
      headers: { Authorization: authHeader },
    });
    expect(bootstrap.status).toBe(200);

    const now = Date.now();
    const rowId = `ar-badjson-${now}`;
    db.prepare(`
      INSERT INTO alert_recipients (id, tenant_id, user_id, name, phone, channels, event_types, min_priority, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(rowId, tenantId, userId, 'Malformed Recipient', '+15551234567', 'not-valid-json', '{bad-json', 'medium', 1, now, now);

    const response = await app.request('/api/alerts/recipients', {
      headers: { Authorization: authHeader },
    });

    expect(response.status).toBe(200);
    const json = await response.json() as { success: boolean; data: Array<{ id: string; channels: string[]; eventTypes: string[] }> };
    expect(json.success).toBe(true);

    const recipient = json.data.find((r) => r.id === rowId);
    expect(recipient).toBeDefined();
    expect(recipient?.channels).toEqual(['sms']);
    expect(recipient?.eventTypes).toEqual([]);
  });
});
