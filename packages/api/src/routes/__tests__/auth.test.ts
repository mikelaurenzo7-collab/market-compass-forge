import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tmpDb = path.join(os.tmpdir(), `beastbots-auth-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes!';
process.env.NODE_ENV = 'test';

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

  // ─── Password Reset Flow ──────────────────────────────────

  it('forgot-password returns success for any email (no enumeration)', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    // Should NOT include resetToken for unknown emails (no token created)
    expect(json.data.resetToken).toBeUndefined();
  });

  it('forgot-password generates token for registered user', async () => {
    clearRateLimits();
    // Re-signup a fresh user for password reset testing
    const signupRes = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'reset-test@example.com',
        password: 'OldPassword123!',
      }),
    });
    expect(signupRes.status).toBe(201);

    clearRateLimits();
    const res = await app.request('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset-test@example.com' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.resetToken).toBeDefined();
  });

  it('reset-password updates password and revokes sessions', async () => {
    clearRateLimits();
    // Get a reset token
    const forgotRes = await app.request('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset-test@example.com' }),
    });
    const forgotJson = await forgotRes.json() as any;
    const resetToken = forgotJson.data.resetToken;

    clearRateLimits();
    // Reset the password
    const res = await app.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: 'NewPassword456!' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);

    // Old password should no longer work
    clearRateLimits();
    const oldLoginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset-test@example.com', password: 'OldPassword123!' }),
    });
    expect(oldLoginRes.status).toBe(401);

    // New password should work
    clearRateLimits();
    const newLoginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset-test@example.com', password: 'NewPassword456!' }),
    });
    expect(newLoginRes.status).toBe(200);
  });

  it('reset-password rejects used token', async () => {
    clearRateLimits();
    const forgotRes = await app.request('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset-test@example.com' }),
    });
    const forgotJson = await forgotRes.json() as any;
    const resetToken = forgotJson.data.resetToken;

    // Use the token
    clearRateLimits();
    await app.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: 'AnotherPass789!' }),
    });

    // Try to reuse it
    clearRateLimits();
    const res = await app.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: 'YetAnother000!' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.error).toContain('already been used');
  });

  it('reset-password rejects invalid token', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'fake-token-123', password: 'Something123!' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.error).toContain('Invalid or expired');
  });

  it('reset-password rejects short password', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'some-token', password: 'short' }),
    });
    expect(res.status).toBe(400);
  });

  it('password reset is recorded in audit log', async () => {
    const db = getDb();
    const rows = db.prepare('SELECT action FROM audit_log ORDER BY created_at ASC').all() as any[];
    const actions = rows.map((r: any) => r.action);
    expect(actions).toContain('password_reset_request');
    expect(actions).toContain('password_reset_complete');
  });
});
