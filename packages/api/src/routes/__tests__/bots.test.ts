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
import { getRuntime } from '@beastbots/workers';

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
    expect(metricsBody.data.authority.mode).toBe('local-runtime');

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

    // other tenant cannot start/stop this bot
    const otherTenantId = `tenant-other-${Date.now()}`;
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(otherTenantId, 'Other Tenant', userId, 'starter', Date.now());
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
      .run(otherTenantId, userId, 'owner');
    const otherToken = await signAccessToken({ userId, tenantId: otherTenantId, email: 'test@example.com' });
    const otherAuth = `Bearer ${otherToken}`;

    const badStart = await app.request(`/api/bots/${createdBotId}/start`, { method: 'POST', headers: { Authorization: otherAuth } });
    expect(badStart.status).toBe(404);
    const badStop = await app.request(`/api/bots/${createdBotId}/stop`, { method: 'POST', headers: { Authorization: otherAuth } });
    expect(badStop.status).toBe(404);

    // ── Observability: history endpoint (persisted after stop) ──
    const historyRes = await app.request(`/api/bots/${createdBotId}/history`, { headers: { Authorization: authHeader } });
    expect(historyRes.status).toBe(200);
    const historyBody = await historyRes.json();
    expect(historyBody.data.botId).toBe(createdBotId);
    expect(Array.isArray(historyBody.data.metricsSnapshots)).toBe(true);
    expect(Array.isArray(historyBody.data.decisions)).toBe(true);

    const delRes2 = await app.request(`/api/bots/${createdBotId}`, { method: 'DELETE', headers: { Authorization: authHeader } });
    expect(delRes2.status).toBe(200);
    const delBody = await delRes2.json();
    expect(delBody.data.deleted).toBe(createdBotId);
  });

  it('starts a workforce bot with inferred category and preserves workforce config updates', async () => {
    const createRes = await app.request('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        family: 'workforce',
        platform: 'slack',
        name: 'Support Workflow',
        config: {
          strategies: ['task_triage'],
          paperMode: true,
          escalationThresholdConfidence: 0.72,
        },
      }),
    });
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const workforceBotId = createBody.data.id;

    const patchRes = await app.request(`/api/bots/${workforceBotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        config: {
          workingHoursUtc: { start: 13, end: 21 },
          maxConcurrentTasks: 2,
        },
      }),
    });
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.data.config.workingHoursUtc).toEqual({ start: 13, end: 21 });
    expect(patchBody.data.config.maxConcurrentTasks).toBe(2);

    const startRes = await app.request(`/api/bots/${workforceBotId}/start`, {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(startRes.status).toBe(200);

    const metricsRes = await app.request(`/api/bots/${workforceBotId}/metrics`, {
      headers: { Authorization: authHeader },
    });
    expect(metricsRes.status).toBe(200);
    const metricsBody = await metricsRes.json();
    expect(metricsBody.data.botId).toBe(workforceBotId);
    expect(metricsBody.data.metrics).toHaveProperty('totalTicks');

    const stopRes = await app.request(`/api/bots/${workforceBotId}/stop`, {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(stopRes.status).toBe(200);
  });

  it('syncs config patches into an already running runtime', async () => {
    db.prepare('UPDATE tenants SET plan = ? WHERE id = ?').run('enterprise', tenantId);

    const createRes = await app.request('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        family: 'workforce',
        platform: 'slack',
        name: 'Live Config Sync',
        config: {
          strategies: ['task_triage'],
          paperMode: true,
          maxConcurrentTasks: 1,
        },
      }),
    });
    expect(createRes.status).toBe(201);
    const botId = (await createRes.json()).data.id;

    const startRes = await app.request(`/api/bots/${botId}/start`, {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(startRes.status).toBe(200);

    const patchRes = await app.request(`/api/bots/${botId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ config: { maxConcurrentTasks: 3 } }),
    });
    expect(patchRes.status).toBe(200);

    const runtime = getRuntime(tenantId, botId);
    expect(runtime?.getState()?.config).toMatchObject({ maxConcurrentTasks: 3 });
    expect((runtime?.getState()?.engineState as any)?.config?.maxConcurrentTasks).toBe(3);

    const stopRes = await app.request(`/api/bots/${botId}/stop`, {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(stopRes.status).toBe(200);
  });

  it('does not persist config changes when active runtime sync fails', async () => {
    const createRes = await app.request('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        family: 'workforce',
        platform: 'slack',
        name: 'Runtime Sync Failure',
        config: { maxConcurrentTasks: 1 },
      }),
    });
    expect(createRes.status).toBe(201);
    const botId = (await createRes.json()).data.id;

    db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('running', botId);

    const previousWorkersBaseUrl = process.env.WORKERS_BASE_URL;
    const previousWorkerToken = process.env.WORKER_AUTH_TOKEN;
    process.env.WORKERS_BASE_URL = 'http://127.0.0.1:9';
    process.env.WORKER_AUTH_TOKEN = 'test-worker-token';

    try {
      const patchRes = await app.request(`/api/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ config: { maxConcurrentTasks: 4 } }),
      });

      expect(patchRes.status).toBe(502);

      const stored = db.prepare('SELECT config FROM bots WHERE id = ?').get(botId) as { config: string };
      expect(JSON.parse(stored.config)).toMatchObject({ maxConcurrentTasks: 1 });
    } finally {
      if (previousWorkersBaseUrl === undefined) delete process.env.WORKERS_BASE_URL;
      else process.env.WORKERS_BASE_URL = previousWorkersBaseUrl;

      if (previousWorkerToken === undefined) delete process.env.WORKER_AUTH_TOKEN;
      else process.env.WORKER_AUTH_TOKEN = previousWorkerToken;
    }
  });
});
