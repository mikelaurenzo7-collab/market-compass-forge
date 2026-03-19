import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signAccessToken } from '../../lib/auth.js';
import { closeDb, getDb } from '../../lib/db.js';

const tmpDb = path.join(os.tmpdir(), `beastbots-alerts-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes!';
process.env.NODE_ENV = 'test';

import app from '../../server.js';

describe('alerts endpoints', () => {
  let authHeader: string;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    const db = getDb();
    const now = Date.now();
    userId = `alerts-user-${now}`;
    tenantId = `alerts-tenant-${now}`;

    db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, 'alerts-test@example.com', 'hash', 'Alerts Tester', now, now);
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(tenantId, 'Alerts Tenant', userId, 'starter', now);
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
      .run(tenantId, userId, 'owner');

    const token = await signAccessToken({ userId, tenantId, email: 'alerts-test@example.com' });
    authHeader = `Bearer ${token}`;
  });

  afterAll(() => {
    try {
      closeDb();
      for (const file of [tmpDb, `${tmpDb}-shm`, `${tmpDb}-wal`]) {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    } catch {
      // ignore cleanup errors in CI sandboxes
    }
  });

  it('falls back to safe defaults when recipient JSON columns are malformed', async () => {
    const db = getDb();
    const now = Date.now();
    await app.request('/api/alerts/recipients', {
      headers: { Authorization: authHeader },
    });

    db.prepare(`
      INSERT INTO alert_recipients (id, tenant_id, user_id, name, phone, channels, event_types, min_priority, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ar_bad_json',
      tenantId,
      userId,
      'Malformed Recipient',
      '+15555550123',
      '{not-json',
      '{still-not-json',
      'medium',
      1,
      now,
      now,
    );

    const response = await app.request('/api/alerts/recipients', {
      headers: { Authorization: authHeader },
    });
    expect(response.status).toBe(200);
    const json = await response.json() as any;
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('ar_bad_json');
    expect(json.data[0].channels).toEqual(['sms']);
    expect(json.data[0].eventTypes).toEqual([]);
  });
});
