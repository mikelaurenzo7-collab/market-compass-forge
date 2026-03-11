import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tmpDb = path.join(os.tmpdir(), `beastbots-cred-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes!';

import app from '../../server.js';
import { getDb, closeDb } from '../../lib/db.js';
import { signAccessToken } from '../../lib/auth.js';

describe('credentials endpoints', () => {
  let authHeader: string;
  let tenantId: string;

  beforeAll(async () => {
    const db = getDb();
    const userId = `user-${Date.now()}`;
    tenantId = `tenant-${Date.now()}`;
    const now = Date.now();
    db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, 'cred-test@example.com', 'hash', 'Cred Tester', now, now);
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(tenantId, 'Cred Tenant', userId, 'starter', now);
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
      .run(tenantId, userId, 'owner');
    const access = await signAccessToken({ userId, tenantId, email: 'cred-test@example.com' });
    authHeader = `Bearer ${access}`;
  });

  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch { /* ignore */ }
  });

  it('blocks unauthenticated access', async () => {
    const res = await app.request('/api/credentials');
    expect(res.status).toBe(401);
  });

  it('lists empty credentials initially', async () => {
    const res = await app.request('/api/credentials', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
  });

  it('saves API key credentials', async () => {
    const res = await app.request('/api/credentials/coinbase', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'test-api-key', apiSecret: 'test-secret' }),
    });
    expect(res.status).toBe(201);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.platform).toBe('coinbase');
    expect(json.data.credentialType).toBe('api_key');
    expect(json.data.status).toBe('active');
  });

  it('rejects unknown platform', async () => {
    const res = await app.request('/api/credentials/nonexistent-platform', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'test' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid body', async () => {
    const res = await app.request('/api/credentials/coinbase', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('lists credentials after save', async () => {
    const res = await app.request('/api/credentials', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.length).toBe(1);
    expect(json.data[0].platform).toBe('coinbase');
  });

  it('gets specific platform status', async () => {
    const res = await app.request('/api/credentials/coinbase', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.connected).toBe(true);
    expect(json.data.platform).toBe('coinbase');
  });

  it('returns not connected for unset platform', async () => {
    const res = await app.request('/api/credentials/binance', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.connected).toBe(false);
  });

  it('upserts credentials on duplicate save', async () => {
    const res = await app.request('/api/credentials/coinbase', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'updated-key' }),
    });
    expect(res.status).toBe(201);

    // Should still have only 1 credential for coinbase
    const list = await app.request('/api/credentials', {
      headers: { Authorization: authHeader },
    });
    const json = await list.json() as any;
    expect(json.data.length).toBe(1);
  });

  it('deletes credentials', async () => {
    const res = await app.request('/api/credentials/coinbase', {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.disconnected).toBe('coinbase');
  });

  it('returns 404 when deleting nonexistent credentials', async () => {
    const res = await app.request('/api/credentials/coinbase', {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(404);
  });

  it('audit log records credential events', async () => {
    const db = getDb();
    const rows = db.prepare('SELECT action FROM audit_log WHERE tenant_id = ? ORDER BY created_at ASC').all(tenantId) as any[];
    const actions = rows.map((r: any) => r.action);
    expect(actions).toContain('save_credentials');
    expect(actions).toContain('delete_credentials');
  });
});
