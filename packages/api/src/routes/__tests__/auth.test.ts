import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tmpDb = path.join(os.tmpdir(), `beastbots-auth-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes!';

import app from '../../server.js';
import { getDb, closeDb } from '../../lib/db.js';

function clearRateLimits() {
  const db = getDb();
  db.prepare('DELETE FROM rate_limits').run();
}

function extractRefreshCookie(res: Response): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(/bb_refresh=([^;]+)/);
  return match ? match[1] : null;
}

describe('auth endpoints', () => {
  let accessToken: string;
  let refreshCookie: string;

  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch { /* ignore */ }
  });

  it('signup creates user and returns tokens', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'auth-test@example.com',
        password: 'SecurePassword123!',
        displayName: 'Auth Tester',
      }),
    });
    expect(res.status).toBe(201);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.accessToken).toBeDefined();
    expect(json.data.user.email).toBe('auth-test@example.com');
    // Refresh token should be in HttpOnly cookie, not in body
    const cookie = extractRefreshCookie(res);
    expect(cookie).toBeTruthy();
    accessToken = json.data.accessToken;
    refreshCookie = cookie!;
  });

  it('signup rejects duplicate email', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'auth-test@example.com',
        password: 'AnotherPass123!',
        displayName: 'Dup User',
      }),
    });
    expect(res.status).toBe(409);
  });

  it('signup rejects invalid payload', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('login returns tokens for valid credentials', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'auth-test@example.com',
        password: 'SecurePassword123!',
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.accessToken).toBeDefined();
    const cookie = extractRefreshCookie(res);
    expect(cookie).toBeTruthy();
    accessToken = json.data.accessToken;
    refreshCookie = cookie!;
  });

  it('login rejects wrong password', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'auth-test@example.com',
        password: 'WrongPassword!',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('login rejects nonexistent user', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody@example.com',
        password: 'Whatever123!',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('GET /me returns profile with valid token', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe('auth-test@example.com');
    expect(json.data.tenantId).toBeDefined();
  });

  it('GET /me rejects without auth', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('refresh rotates tokens', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `bb_refresh=${refreshCookie}`,
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.accessToken).toBeDefined();
    const newCookie = extractRefreshCookie(res);
    expect(newCookie).toBeTruthy();
    const oldCookie = refreshCookie;
    refreshCookie = newCookie!;
    accessToken = json.data.accessToken;

    clearRateLimits();
    const retry = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `bb_refresh=${oldCookie}`,
      },
      body: JSON.stringify({}),
    });
    expect(retry.status).toBe(401);
  });

  it('logout revokes tokens', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    expect(res.status).toBe(200);

    // Refresh token should no longer work after logout
    clearRateLimits();
    const retry = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `bb_refresh=${refreshCookie}`,
      },
      body: JSON.stringify({}),
    });
    expect(retry.status).toBe(401);
  });

  it('audit log records auth events', async () => {
    const db = getDb();
    const rows = db.prepare('SELECT action FROM audit_log ORDER BY created_at ASC').all() as any[];
    const actions = rows.map((r: any) => r.action);
    expect(actions).toContain('signup');
    expect(actions).toContain('login');
    expect(actions).toContain('logout');
  });
});
