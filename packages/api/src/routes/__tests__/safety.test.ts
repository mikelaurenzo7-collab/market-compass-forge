import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tmpDb = path.join(os.tmpdir(), `beastbots-safety-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes!';

import app from '../../server.js';
import { getDb, closeDb } from '../../lib/db.js';
import { signAccessToken } from '../../lib/auth.js';

describe('safety endpoints', () => {
  let authHeader: string;
  let tenantId: string;

  beforeAll(async () => {
    const db = getDb();
    const userId = `user-${Date.now()}`;
    tenantId = `tenant-${Date.now()}`;
    const now = Date.now();
    db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, 'safety-test@example.com', 'hash', 'Safety Tester', now, now);
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(tenantId, 'Safety Tenant', userId, 'starter', now);
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
      .run(tenantId, userId, 'owner');
    const access = await signAccessToken({ userId, tenantId, email: 'safety-test@example.com' });
    authHeader = `Bearer ${access}`;
  });

  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch { /* ignore */ }
  });

  it('blocks unauthenticated access', async () => {
    const res = await app.request('/api/safety/defaults/trading');
    expect(res.status).toBe(401);
  });

  it('returns trading safety defaults', async () => {
    const res = await app.request('/api/safety/defaults/trading', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.policies).toBeDefined();
    expect(json.data.budget).toBeDefined();
    expect(json.data.circuitBreaker).toBeDefined();
  });

  it('returns store safety defaults', async () => {
    const res = await app.request('/api/safety/defaults/store', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.policies).toBeDefined();
  });

  it('returns social safety defaults', async () => {
    const res = await app.request('/api/safety/defaults/social', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.policies).toBeDefined();
  });

  it('returns workforce safety defaults', async () => {
    const res = await app.request('/api/safety/defaults/workforce', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.policies).toBeDefined();
  });

  it('rejects invalid family', async () => {
    const res = await app.request('/api/safety/defaults/invalid', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(400);
  });

  it('returns audit log (empty initially)', async () => {
    const res = await app.request('/api/safety/audit', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('returns empty approvals queue', async () => {
    const res = await app.request('/api/safety/approvals', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('returns 404 for nonexistent approval', async () => {
    const res = await app.request('/api/safety/approvals/nonexistent/resolve', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true, resolvedBy: 'tester' }),
    });
    expect(res.status).toBe(404);
  });

  it('rejects invalid resolve body', async () => {
    const res = await app.request('/api/safety/approvals/some-id/resolve', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: 'not-a-boolean' }),
    });
    expect(res.status).toBe(400);
  });
});
