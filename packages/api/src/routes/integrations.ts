import { Hono } from 'hono';
import { INTEGRATIONS } from '@beastbots/shared';
import type { IntegrationCategory } from '@beastbots/shared';
import { getDb } from '../lib/db.js';
import { verifyAuthHeader } from '../lib/auth.js';
import { encrypt } from '../lib/crypto.js';
import { getAdapter } from '../lib/oauthProviders.js';
import crypto from 'node:crypto';
import { logAudit } from '../lib/audit.js';

export const integrationsRouter = new Hono();

integrationsRouter.get('/', (c) => {
  const category = c.req.query('category') as IntegrationCategory | undefined;
  const status = c.req.query('status') as 'planned' | 'beta' | 'ga' | undefined;

  let results = INTEGRATIONS;
  if (category) results = results.filter((i) => i.category === category);
  if (status) results = results.filter((i) => i.status === status);

  return c.json({
    success: true,
    data: results,
    meta: {
      total: results.length,
      byCategory: {
        trading: results.filter((i) => i.category === 'trading').length,
        ecommerce: results.filter((i) => i.category === 'ecommerce').length,
        social: results.filter((i) => i.category === 'social').length,
        workforce: results.filter((i) => i.category === 'workforce').length,
        communication: results.filter((i) => i.category === 'communication').length,
        project_management: results.filter((i) => i.category === 'project_management').length,
        crm: results.filter((i) => i.category === 'crm').length,
      },
    },
  });
});

integrationsRouter.get('/:id', (c) => {
  const integration = INTEGRATIONS.find((i) => i.id === c.req.param('id'));
  if (!integration) {
    return c.json({ success: false, error: 'Integration not found' }, 404);
  }
  // compute whether OAuth flow is actually configured (env vars present)
  let oauthReady = false;
  if (integration.oauth) {
    try {
      const adapter = getAdapter(integration.id);
      // use dummy values; adapter should throw if config missing
      adapter.authorizeUrl({ provider: integration.id, redirectUri: 'https://example.com', state: 'test' });
      oauthReady = true;
    } catch {
      oauthReady = false;
    }
  }
  return c.json({ success: true, data: { ...integration, oauthReady } });
});

// ─── OAuth connect/start ─────────────────────────────────────
integrationsRouter.get('/:id/connect', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const id = c.req.param('id');
  const integration = INTEGRATIONS.find((i) => i.id === id);
  if (!integration) return c.json({ success: false, error: 'Integration not found' }, 404);

  const state = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000;
  const db = getDb();

  const apiBase = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  const redirectUri = `${apiBase}/api/integrations/${id}/callback`;

  // audit initiation
  logAudit({
    tenantId: auth.tenantId,
    userId: auth.userId,
    platform: id,
    action: 'oauth_init',
    result: 'pending',
    riskLevel: 'low',
    details: '',
  });

  try {
    const adapter = getAdapter(id);
    // ensure query params are object; Hono may return string when none
    const rawQuery = c.req.query();
    let queryObj: Record<string, string> = {};
    if (rawQuery && typeof rawQuery === 'object') {
      queryObj = rawQuery as Record<string, string>;
    }
    const { url, stateData } = adapter.authorizeUrl({
      provider: id,
      redirectUri,
      state,
      query: queryObj,
    });

    const dataJson = stateData ? JSON.stringify(stateData) : null;
    db.prepare('INSERT INTO oauth_states (state, user_id, tenant_id, provider, created_at, expires_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(state, auth.userId, auth.tenantId, id, now, expiresAt, dataJson);

    const wantsJson =
      (c.req.header('Accept') ?? '').includes('application/json') ||
      c.req.query('format') === 'url';

    if (wantsJson) {
      return c.json({ success: true, url });
    }
    return c.redirect(url);
  } catch (err) {
    console.error('[OAuth init error]', err);
    return c.json({ success: false, error: 'oauth_not_configured' }, 500);
  }
  const dataJson = stateData ? JSON.stringify(stateData) : null;
  db.prepare('INSERT INTO oauth_states (state, user_id, tenant_id, provider, created_at, expires_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(state, auth.userId, auth.tenantId, id, now, expiresAt, dataJson);

  // Support JSON response for SPA callers (avoids fetch() cross-origin redirect issues)
  // Frontend should check Accept header or pass ?format=url to get the URL as JSON
  const wantsJson =
    (c.req.header('Accept') ?? '').includes('application/json') ||
    c.req.query('format') === 'url';

  if (wantsJson) {
    return c.json({ success: true, url });
  }
  return c.redirect(url);
});

// ─── OAuth callback ──────────────────────────────────────────
integrationsRouter.get('/:id/callback', async (c) => {
  const id = c.req.param('id');
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!state) return c.text('Missing state', 400);
  const db = getDb();
  const row = db.prepare('SELECT state, user_id, tenant_id, provider, expires_at, data FROM oauth_states WHERE state = ?').get(state) as { state: string; user_id: string; tenant_id: string; provider: string; expires_at: number; data: string | null } | undefined;
  if (!row) return c.text('Invalid or expired state', 400);
  if (Date.now() > row.expires_at) return c.text('Expired state', 400);

  if (!code) return c.text('Missing code', 400);
  const apiBase = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  const redirectUri = `${apiBase}/api/integrations/${id}/callback`;

  const adapter = getAdapter(id);
  const stateData = row.data ? JSON.parse(row.data) : undefined;
  try {
    const data = await adapter.exchangeToken({ provider: id, code: String(code), redirectUri, stateData });

    const now2 = Date.now();
    const credId = crypto.randomBytes(8).toString('hex');
    const encrypted = encrypt(JSON.stringify(data));
    db.prepare('DELETE FROM credentials WHERE tenant_id = ? AND platform = ?').run(row.tenant_id, id);
    db.prepare('INSERT INTO credentials (id, tenant_id, platform, credential_type, encrypted_data, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(credId, row.tenant_id, id, 'oauth2', encrypted, 'active', now2, now2);
    // audit success for OAuth connection
    logAudit({
      tenantId: row.tenant_id,
      userId: row.user_id,
      platform: id,
      action: 'oauth_connect',
      result: 'success',
      riskLevel: 'medium',
      details: JSON.stringify({ provider: id, success: true }),
    });
    db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);

    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return c.redirect(`${frontend}/integrations?connected=${id}`);
  } catch (e: any) {
    console.error(`[OAuth callback error] provider=${id}:`, e.message);
    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return c.redirect(`${frontend}/integrations?error=oauth_failed`);
  }
});
