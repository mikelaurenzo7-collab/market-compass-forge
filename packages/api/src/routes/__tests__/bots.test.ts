import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Set DATABASE_PATH before importing app so the DB is initialized at the test DB path
const tmpDb = path.join(os.tmpdir(), `beastbots-test-${Date.now()}-${Math.random().toString(36).slice(2,8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes!';

import app from '../../server';
import { getDb, closeDb } from '../../lib/db';
import { signAccessToken } from '../../lib/auth';

describe('bots endpoints (DB-backed)', () => {
  let db: any;
  let userId: string;
  let tenantId: string;
  let authHeader: string;
  let createdBotId: string;

  beforeAll(async () => {
    db = getDb();
    // create user and tenant
    userId = `user-${Date.now()}`;
    tenantId = `tenant-${Date.now()}`;
    const now = Date.now();
    db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, 'test@example.com', 'hash', 'Test User', now, now);
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(tenantId, 'Test Tenant', userId, 'starter', now);
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
      .run(tenantId, userId, 'owner');

    const access = await signAccessToken({ userId, tenantId, email: 'test@example.com' });
    authHeader = `Bearer ${access}`;
  });

  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch (e) {
      // ignore
    }
  });

  it('blocks unauthenticated access', async () => {
    const res = await app.request('/api/bots');
    expect(res.status).toBe(401);
  });

  it('creates a bot', async () => {
    const payload = { family: 'trading', platform: 'coinbase', name: 'Test Bot', config: { foo: 'bar' } };
    const res = await app.request('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('id');
    expect(body.data.name).toBe('Test Bot');
    createdBotId = body.data.id;
  });

  it('lists bots for tenant', async () => {
    const res = await app.request('/api/bots', { headers: { Authorization: authHeader } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.find((b: any) => b.id === createdBotId)).toBeTruthy();
  });

  it('gets a single bot', async () => {
    const res = await app.request(`/api/bots/${createdBotId}`, { headers: { Authorization: authHeader } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(createdBotId);
  });

  it('updates bot name and config', async () => {
    const res = await app.request(`/api/bots/${createdBotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ name: 'Renamed Bot', config: { new: 'val' } }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Renamed Bot');
    expect(body.data.config.new).toBe('val');
  });

  it('start -> cannot delete while running -> stop -> delete', async () => {
    const startRes = await app.request(`/api/bots/${createdBotId}/start`, { method: 'POST', headers: { Authorization: authHeader } });
    expect(startRes.status).toBe(200);
    const startBody = await startRes.json();
    expect(startBody.data.status).toBe('running');

    const delRes1 = await app.request(`/api/bots/${createdBotId}`, { method: 'DELETE', headers: { Authorization: authHeader } });
    expect(delRes1.status).toBe(400);

    // ── Observability: metrics endpoint while running ──
    const metricsRes = await app.request(`/api/bots/${createdBotId}/metrics`, { headers: { Authorization: authHeader } });
    expect(metricsRes.status).toBe(200);
    const metricsBody = await metricsRes.json();
    expect(metricsBody.data.botId).toBe(createdBotId);
    expect(metricsBody.data.metrics).toHaveProperty('totalTicks');
    expect(metricsBody.data.status).toBe('running');

    // ── Observability: trace endpoint ──
    const traceRes = await app.request(`/api/bots/${createdBotId}/trace`, { headers: { Authorization: authHeader } });
    expect(traceRes.status).toBe(200);
    const traceBody = await traceRes.json();
    expect(traceBody.data.botId).toBe(createdBotId);
    expect(Array.isArray(traceBody.data.ticks)).toBe(true);

    // ── Observability: decisions endpoint ──
    const decisionsRes = await app.request(`/api/bots/${createdBotId}/decisions`, { headers: { Authorization: authHeader } });
    expect(decisionsRes.status).toBe(200);
    const decisionsBody = await decisionsRes.json();
    expect(Array.isArray(decisionsBody.data.decisions)).toBe(true);

    const stopRes = await app.request(`/api/bots/${createdBotId}/stop`, { method: 'POST', headers: { Authorization: authHeader } });
    expect(stopRes.status).toBe(200);

    // ── Observability: history endpoint (persisted after stop) ──
    const historyRes = await app.request(`/api/bots/${createdBotId}/history`, { headers: { Authorization: authHeader } });
    expect(historyRes.status).toBe(200);
    const historyBody = await historyRes.json();
    expect(historyBody.data.botId).toBe(createdBotId);
    expect(Array.isArray(historyBody.data.metricsSnapshots)).toBe(true);

    const delRes2 = await app.request(`/api/bots/${createdBotId}`, { method: 'DELETE', headers: { Authorization: authHeader } });
    expect(delRes2.status).toBe(200);
    const delBody = await delRes2.json();
    expect(delBody.data.deleted).toBe(createdBotId);
  });
});
