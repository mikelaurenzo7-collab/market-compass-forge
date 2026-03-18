import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tmpDb = path.join(os.tmpdir(), `beastbots-test-alerts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';

import app from '../../server.js';
import { closeDb, getDb } from '../../lib/db.js';
import { signAccessToken } from '../../lib/auth.js';

describe('alerts endpoints', () => {
  let authHeader: string;
  let tenantId: string;

  beforeAll(async () => {
    const db = getDb();
    const now = Date.now();
    const userId = `user-alerts-${now}`;
    tenantId = `tenant-alerts-${now}`;

    db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, 'alerts@example.com', 'hash', 'Alerts User', now, now);
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(tenantId, 'Alerts Tenant', userId, 'starter', now);
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
      .run(tenantId, userId, 'owner');

    const token = await signAccessToken({ userId, tenantId, email: 'alerts@example.com' });
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

  it('falls back safely when channels/event_types contain invalid JSON', async () => {
    const db = getDb();

    // Trigger lazy table bootstrap middleware before inserting direct fixtures.
    const bootstrapResponse = await app.request('/api/alerts/recipients', {
      headers: { Authorization: authHeader },
    });
    expect(bootstrapResponse.status).toBe(200);

    const now = Date.now();
    const recipientId = `ar-bad-json-${now}`;
    db.prepare(`
      INSERT INTO alert_recipients (
        id, tenant_id, user_id, name, phone, channels, event_types, min_priority, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      recipientId,
      tenantId,
      `user-alerts-${now}`,
      'Malformed Recipient',
      '+14155550123',
      '{"not":"an array"',
      '{"also":"bad"',
      'medium',
      1,
      now,
      now,
    );

    const response = await app.request('/api/alerts/recipients', {
      headers: { Authorization: authHeader },
    });

    expect(response.status).toBe(200);
    const json = await response.json() as { success: boolean; data: Array<Record<string, unknown>> };
    expect(json.success).toBe(true);

    const recipient = json.data.find((entry) => entry.id === recipientId) as {
      channels: string[];
      eventTypes: string[];
    } | undefined;

    expect(recipient).toBeDefined();
    expect(recipient?.channels).toEqual(['sms']);
    expect(recipient?.eventTypes).toEqual([]);
  });
});
