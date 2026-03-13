import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { closeDb, getDb } from '../../lib/db.js';
import { signAccessToken } from '../../lib/auth.js';
import app from '../../server.js';

const tmpDb = path.join(
  os.tmpdir(),
  `beastbots-test-contracts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';

describe('API contracts and auth hardening', () => {
  let authHeader: string;
  let userId: string;
  let tenantId: string;

  beforeAll(async () => {
    const db = getDb();
    const now = Date.now();
    userId = `user-contracts-${now}`;
    tenantId = `tenant-contracts-${now}`;

    db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, 'contracts@example.com', 'hashed', 'Contracts User', now, now);
    db.prepare('INSERT INTO tenants (id, name, owner_user_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(tenantId, 'Contracts Tenant', userId, 'starter', now);
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
      .run(tenantId, userId, 'owner');

    const access = await signAccessToken({ userId, tenantId, email: 'contracts@example.com' });
    authHeader = `Bearer ${access}`;
  });

  afterAll(() => {
    closeDb();
    if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  });

  it('supports federated status/opt-in compatibility endpoints', async () => {
    const statusRes = await app.request('/api/federated/status', {
      headers: { Authorization: authHeader },
    });
    expect(statusRes.status).toBe(200);
    const statusJson = await statusRes.json() as any;
    expect(statusJson.success).toBe(true);
    expect(statusJson.data.enabled).toBe(false);

    const optInRes = await app.request('/api/federated/opt-in', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    expect(optInRes.status).toBe(200);
    const optInJson = await optInRes.json() as any;
    expect(optInJson.success).toBe(true);
    expect(optInJson.data.enabled).toBe(true);

    const configRes = await app.request('/api/federated/config', {
      headers: { Authorization: authHeader },
    });
    expect(configRes.status).toBe(200);
    const configJson = await configRes.json() as any;
    expect(configJson.success).toBe(true);
    expect(configJson.data.enabled).toBe(true);
  });

  it('deploys a bot from template endpoint', async () => {
    const res = await app.request('/api/templates/btc-dca-weekly/deploy', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Template Bot', platform: 'coinbase' }),
    });
    expect(res.status).toBe(201);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('My Template Bot');
    expect(json.data.platform).toBe('coinbase');
    expect(json.data.family).toBe('trading');

    const db = getDb();
    const row = db.prepare('SELECT id, name, platform, family FROM bots WHERE id = ?').get(json.data.id) as any;
    expect(row).toBeDefined();
    expect(row.name).toBe('My Template Bot');
  });

  it('rejects access token with tenant claim user is not member of', async () => {
    const invalidTenantToken = await signAccessToken({
      userId,
      tenantId: 'tenant-not-member',
      email: 'contracts@example.com',
    });

    const res = await app.request('/api/bots', {
      headers: { Authorization: `Bearer ${invalidTenantToken}` },
    });
    expect(res.status).toBe(401);
  });
});
