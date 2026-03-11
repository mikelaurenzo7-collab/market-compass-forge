import { Hono } from 'hono';
import { z } from 'zod';
import { INTEGRATIONS } from '@beastbots/shared';
import { getDb } from '../lib/db.js';
import { verifyAuthHeader } from '../lib/auth.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { logAudit } from '../lib/audit.js';

const validPlatforms = INTEGRATIONS.map(i => i.id);

export const credentialsRouter = new Hono();

// ─── Schemas ──────────────────────────────────────────────────

const saveCredentialSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().optional(),
  passphrase: z.string().optional(),
  additionalFields: z.record(z.string()).optional(),
});

// ─── GET / — List connected platforms ────────────────────────

credentialsRouter.get('/', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();
  const rows = db.prepare(
    'SELECT id, platform, credential_type, status, created_at, updated_at FROM credentials WHERE tenant_id = ?'
  ).all(auth.tenantId) as {
    id: string; platform: string; credential_type: string;
    status: string; created_at: number; updated_at: number;
  }[];

  return c.json({
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      platform: r.platform,
      credentialType: r.credential_type,
      status: r.status,
      connectedAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  });
});

// ─── POST /:platform — Save API key credentials ─────────────

credentialsRouter.post('/:platform', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const platform = c.req.param('platform');
  if (!validPlatforms.includes(platform)) {
    return c.json({ success: false, error: `Unknown platform: ${platform}` }, 400);
  }

  const body = await c.req.json();
  const parsed = saveCredentialSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb();
  const id = `cred_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const encryptedData = encrypt(JSON.stringify(parsed.data));

  // Upsert — replace if already connected
  db.prepare(
    'DELETE FROM credentials WHERE tenant_id = ? AND platform = ?'
  ).run(auth.tenantId, platform);

  db.prepare(
    'INSERT INTO credentials (id, tenant_id, platform, credential_type, encrypted_data, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, auth.tenantId, platform, 'api_key', encryptedData, 'active', now, now);

  // audit
  logAudit({
    tenantId: auth.tenantId,
    userId: auth.userId,
    platform,
    action: 'save_credentials',
    result: 'success',
    riskLevel: 'medium',
    details: `platform=${platform}`,
  });

  return c.json({
    success: true,
    data: { id, platform, credentialType: 'api_key', status: 'active', connectedAt: now },
  }, 201);
});

// ─── DELETE /:platform — Disconnect platform ────────────────

credentialsRouter.delete('/:platform', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const platform = c.req.param('platform');
  const db = getDb();

  const result = db.prepare(
    'DELETE FROM credentials WHERE tenant_id = ? AND platform = ?'
  ).run(auth.tenantId, platform);

  if (result.changes === 0) {
    return c.json({ success: false, error: 'No credentials found for this platform' }, 404);
  }

  logAudit({
    tenantId: auth.tenantId,
    userId: auth.userId,
    platform,
    action: 'delete_credentials',
    result: 'success',
    riskLevel: 'medium',
    details: `platform=${platform}`,
  });

  return c.json({ success: true, data: { disconnected: platform } });
});

// ─── GET /:platform — Get connection status ─────────────────

credentialsRouter.get('/:platform', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const platform = c.req.param('platform');
  const db = getDb();

  const row = db.prepare(
    'SELECT id, platform, credential_type, status, created_at, updated_at FROM credentials WHERE tenant_id = ? AND platform = ?'
  ).get(auth.tenantId, platform) as {
    id: string; platform: string; credential_type: string;
    status: string; created_at: number; updated_at: number;
  } | undefined;

  if (!row) {
    return c.json({ success: true, data: { connected: false, platform } });
  }

  return c.json({
    success: true,
    data: {
      connected: true,
      id: row.id,
      platform: row.platform,
      credentialType: row.credential_type,
      status: row.status,
      connectedAt: row.created_at,
    },
  });
});
