import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { getDb, closeDb } from '../../lib/db.js';
import { signAccessToken } from '../../lib/auth.js';
import { decrypt } from '../../lib/crypto.js';

// use isolated temp database for these tests
const tmpDb = path.join(os.tmpdir(), `beastbots-test-routes-${Date.now()}-${Math.random().toString(36).slice(2,8)}.db`);
process.env.DATABASE_PATH = tmpDb;

// OAuth test configuration
process.env.OAUTH_COINBASE_AUTHORIZE_URL = 'https://coinbase.test/authorize';
process.env.OAUTH_COINBASE_TOKEN_URL = 'https://coinbase.test/token';
process.env.OAUTH_COINBASE_CLIENT_ID = 'cb-test';
process.env.OAUTH_COINBASE_CLIENT_SECRET = 'cb-secret';
process.env.OAUTH_SHOPIFY_AUTHORIZE_URL = 'https://shopify.test/authorize';
process.env.OAUTH_SHOPIFY_CLIENT_ID = 'sh-test';
process.env.OAUTH_X_AUTHORIZE_URL = 'https://x.test/authorize';
process.env.OAUTH_X_CLIENT_ID = 'x-test';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';
import app from '../../server.js';

describe('API Routes', () => {
  describe('GET /api/integrations', () => {
    it('returns all integrations', async () => {
      const response = await app.request('/api/integrations');
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.meta).toBeDefined();
      expect(json.meta.total).toBe(json.data.length);

      const coinbase = json.data.find((i: any) => i.id === 'coinbase');
      expect(coinbase).toBeDefined();
      expect(coinbase.oauth).toBe(true);
      expect(coinbase.oauthReady).toBe(true);

      const vertex = json.data.find((i: any) => i.id === 'vertex_ai');
      expect(vertex).toBeDefined();
      expect(vertex.oauth).toBe(false);
      expect(vertex.oauthReady).toBe(true);
    });

    it('filters by category',async () => {
      const response = await app.request('/api/integrations?category=trading');
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.every((i: any) => i.category === 'trading')).toBe(true);
    });

    it('filters by status', async () => {
      const response = await app.request('/api/integrations?status=beta');
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.every((i: any) => i.status === 'beta')).toBe(true);
    });
  });

  describe('GET /api/integrations/:id', () => {
    it('returns single integration by id', async () => {
      const response = await app.request('/api/integrations/coinbase');
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('coinbase');
      expect(json.data.oauthReady).toBe(true);
    });

    it('returns 404 for unknown id', async () => {
      const response = await app.request('/api/integrations/nonexistent');
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  });

  describe('GET /api/pricing', () => {
    it('returns all pricing plans', async () => {
      const response = await app.request('/api/pricing');
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/pricing/:family', () => {
    it('returns plans for a specific family', async () => {
      const response = await app.request('/api/pricing/trading');
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.every((p: any) => p.family === 'trading')).toBe(true);
    });

    it('returns 404 for unknown family', async () => {
      const response = await app.request('/api/pricing/unknown');
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  });

  describe('GET /api/health', () => {
    it('returns healthy status with metadata', async () => {
      const response = await app.request('/api/health');
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('ok');
      expect(json.data).toHaveProperty('version');
      expect(json.data).toHaveProperty('uptime');
      expect(json.data).toHaveProperty('timestamp');
    });
  });

  describe('Root endpoint', () => {
    it('returns API info', async () => {
      const response = await app.request('/');
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('BeastBots API');
      expect(json.data.version).toBe('0.1.0');
    });
  });

  describe('Auth audit events', () => {
    it('records signup/login/logout/refresh in audit table', async () => {
      const db = getDb();
      // clear audit entries
      db.prepare('DELETE FROM audit_log').run();

      // signup
      const signRes = await app.request('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@x.com', password: 'password123', displayName: 'New' }),
      });
      expect(signRes.status).toBe(201);
      const signupAudit = db.prepare('SELECT * FROM audit_log WHERE action = ?').get('signup') as any;
      expect(signupAudit).toBeDefined();
      expect(signupAudit.result).toBe('success');

      // login success
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@x.com', password: 'password123' }),
      });
      expect(loginRes.status).toBe(200);
      const body = await loginRes.json();
      const token = body.data.accessToken;
      expect(token).toBeTruthy();
      const loginAudit = db.prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC').get('login') as any;
      expect(loginAudit).toBeDefined();
      expect(loginAudit.result).toBe('success');

      // refresh token — sent via HttpOnly cookie
      const refreshCookie = loginRes.headers.get('set-cookie')?.match(/bb_refresh=([^;]+)/)?.[1];
      expect(refreshCookie).toBeTruthy();
      const refreshRes = await app.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `bb_refresh=${refreshCookie}` },
        body: JSON.stringify({}),
      });
      expect(refreshRes.status).toBe(200);
      const refreshAudit = db.prepare('SELECT * FROM audit_log WHERE action = ?').get('refresh_token') as any;
      expect(refreshAudit).toBeDefined();
      expect(refreshAudit.result).toBe('success');

      // logout
      const logoutRes = await app.request('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      expect(logoutRes.status).toBe(200);
      const logoutAudit = db.prepare('SELECT * FROM audit_log WHERE action = ?').get('logout') as any;
      expect(logoutAudit).toBeDefined();
      expect(logoutAudit.result).toBe('success');
    });
  });

  describe('OAuth connect flows', { concurrent: false }, () => {
    let authHeader: string;

    beforeAll(async () => {
      const db = getDb();
      db.prepare('DELETE FROM oauth_states').run();
      const userId = 'user-oauth';
      const tenantId = 'tenant-oauth';
      const now = Date.now();
      db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(userId, 'a@b.com', 'h', 'A', now, now);
      db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(tenantId, 'T', userId, 'starter', now);
      db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)').run(tenantId, userId, 'owner');
      const tok = await signAccessToken({ userId, tenantId, email: 'a@b.com' });
      authHeader = `Bearer ${tok}`;
    });

    it('redirects to coinbase authorize with state', async () => {
      const res = await app.request('/api/integrations/coinbase/connect', { headers: { Authorization: authHeader } });
      expect(res.status).toBe(302);
      const location = res.headers.get('location') || '';
      expect(location).toContain('https://coinbase.test/authorize');
      expect(location).toMatch(/state=/);

      const audit = getDb().prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC').get('oauth_init') as any;
      expect(audit).toBeDefined();
      expect(audit.platform).toBe('coinbase');
    });

    it('shopify connect requires shop query', async () => {
      const res1 = await app.request('/api/integrations/shopify/connect', { headers: { Authorization: authHeader } });
      expect(res1.status).toBe(400);
      const res2 = await app.request('/api/integrations/shopify/connect?shop=myshop', { headers: { Authorization: authHeader } });
      expect(res2.status).toBe(302);
      expect(res2.headers.get('location')).toContain('shop=myshop');
    });

    it('redirects to x authorize with PKCE', async () => {
      const res = await app.request('/api/integrations/x/connect', { headers: { Authorization: authHeader } });
      expect(res.status).toBe(302);
      const location = res.headers.get('location') || '';
      expect(location).toContain('https://x.test/authorize');
      expect(location).toMatch(/code_challenge=/);
      expect(location).toMatch(/code_challenge_method=S256/);
    });

    it('handles callback and stores coinbase credentials', async () => {
      // perform connect to capture state
      const conn = await app.request('/api/integrations/coinbase/connect', { headers: { Authorization: authHeader } });
      const loc = conn.headers.get('location') || '';
      const u = new URL(loc);
      const state = u.searchParams.get('state');
      expect(state).toBeTruthy();

      // mock token exchange
      const fakeData = { access_token: 'aat', refresh_token: 'rr' };
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fakeData });
      global.fetch = fetchMock as any;

      const cb = await app.request(`/api/integrations/coinbase/callback?state=${encodeURIComponent(state!)}&code=code123`);
      if (cb.status !== 302) {
        const text = await cb.text();
        console.error('callback failure body:', text);
      }
      expect(cb.status).toBe(302);
      expect(cb.headers.get('location')).toContain('/integrations?connected=coinbase');

      const row = getDb().prepare('SELECT * FROM credentials WHERE platform = ?').get('coinbase') as any;
      expect(row).toBeDefined();
      const decrypted = JSON.parse(decrypt(row.encrypted_data));
      expect(decrypted).toEqual(fakeData);

      // audit log entry should exist
      const audit = getDb().prepare('SELECT * FROM audit_log WHERE platform = ? ORDER BY created_at DESC').get('coinbase') as any;
      expect(audit).toBeDefined();
      expect(audit.action).toBe('oauth_connect');
    });

    it('saving manual credentials creates audit entry', async () => {
      // we can hit POST /api/credentials/coinbase directly
      const tok = await signAccessToken({ userId: 'user-oauth', tenantId: 'tenant-oauth', email: 'a@b.com' });
      const head = { Authorization: `Bearer ${tok}` };
      const resp = await app.request('/api/credentials/coinbase', {
        method: 'POST',
        headers: head,
        body: JSON.stringify({ apiKey: 'k', apiSecret: 's' }),
      });
      expect(resp.status).toBe(201);
      const audit = getDb().prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC').get('save_credentials') as any;
      expect(audit).toBeDefined();
      expect(audit.platform).toBe('coinbase');

      // also reachable via API
      const res2 = await app.request('/api/audit', { headers: { Authorization: authHeader } });
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.success).toBe(true);
      expect(json2.data.length).toBeGreaterThan(0);
    });

    // new bot-related audit tests
    describe('Bot API audit logging', () => {
      let botId: string;

      it('creates a bot and logs audit', async () => {
        const res = await app.request('/api/bots', {
          method: 'POST',
          headers: { Authorization: authHeader },
          body: JSON.stringify({ family: 'trading', platform: 'coinbase', name: 'Test Bot' }),
        });
        expect(res.status).toBe(201);
        const json = await res.json();
        botId = json.data.id;

        const audit = getDb().prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC').get('create_bot') as any;
        expect(audit).toBeDefined();
        expect(audit.details).toContain(botId);
      });

      it('updates a bot and logs audit', async () => {
        const res = await app.request(`/api/bots/${botId}`, {
          method: 'PATCH',
          headers: { Authorization: authHeader },
          body: JSON.stringify({ name: 'Renamed Bot' }),
        });
        expect(res.status).toBe(200);

        const audit = getDb().prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC').get('update_bot') as any;
        expect(audit).toBeDefined();
        expect(audit.details).toContain(botId);
      });

      it('starts a bot and logs audit', async () => {
        const res = await app.request(`/api/bots/${botId}/start`, {
          method: 'POST',
          headers: { Authorization: authHeader },
        });
        expect(res.status).toBe(200);

        const audit = getDb().prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC').get('start_bot') as any;
        expect(audit).toBeDefined();
        expect(audit.details).toContain(botId);
      });

      it('pauses a bot and logs audit', async () => {
        const res = await app.request(`/api/bots/${botId}/pause`, {
          method: 'POST',
          headers: { Authorization: authHeader },
        });
        expect(res.status).toBe(200);
        const audit = getDb().prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC').get('pause_bot') as any;
        expect(audit).toBeDefined();
        expect(audit.details).toContain(botId);
      });

      it('stops a bot and logs audit', async () => {
        const res = await app.request(`/api/bots/${botId}/stop`, {
          method: 'POST',
          headers: { Authorization: authHeader },
        });
        expect(res.status).toBe(200);
        const audit = getDb().prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC').get('stop_bot') as any;
        expect(audit).toBeDefined();
        expect(audit.details).toContain(botId);
      });

      it('kills a bot and logs audit', async () => {
        const res = await app.request(`/api/bots/${botId}/kill`, {
          method: 'POST',
          headers: { Authorization: authHeader },
        });
        expect(res.status).toBe(200);
        const audit = getDb().prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC').get('kill_bot') as any;
        expect(audit).toBeDefined();
        expect(audit.details).toContain(botId);
      });

      it('deletes a bot and logs audit', async () => {
        const res = await app.request(`/api/bots/${botId}`, {
          method: 'DELETE',
          headers: { Authorization: authHeader },
        });
        expect(res.status).toBe(200);
        const audit = getDb().prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC').get('delete_bot') as any;
        expect(audit).toBeDefined();
        expect(audit.details).toContain(botId);
      });
    });
  });
});
