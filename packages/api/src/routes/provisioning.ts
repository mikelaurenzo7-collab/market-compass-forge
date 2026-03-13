import { Hono } from 'hono';
import { z } from 'zod';
import { verifyAuthHeader } from '../lib/auth.js';
import { getDb } from '../lib/db.js';
import { logAudit } from '../lib/audit.js';

export const provisioningRouter = new Hono();

const STORE_CREATION_CAPABILITIES: Record<string, { supported: boolean; mode: 'api' | 'partner' | 'unsupported'; notes: string }> = {
  shopify: {
    supported: false,
    mode: 'partner',
    notes: 'Shopify merchant store creation is partner-scoped and not generally available via standard merchant APIs.',
  },
  woocommerce: {
    supported: true,
    mode: 'api',
    notes: 'Supported for self-hosted stacks where tenant controls hosting and WordPress provisioning.',
  },
  square: {
    supported: false,
    mode: 'unsupported',
    notes: 'Square account/store creation is not available for autonomous API provisioning.',
  },
  amazon: {
    supported: false,
    mode: 'unsupported',
    notes: 'Amazon seller account creation is compliance-gated and not API-provisionable.',
  },
  etsy: {
    supported: false,
    mode: 'unsupported',
    notes: 'Etsy shop creation requires interactive user flows and policy checks.',
  },
  ebay: {
    supported: false,
    mode: 'unsupported',
    notes: 'eBay account/shop setup is user-interactive and not autonomous via API.',
  },
};

const requestSchema = z.object({
  platform: z.string().min(1),
  botId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  userConsent: z.boolean(),
});

const resolveSchema = z.object({
  approved: z.boolean(),
  reason: z.string().max(500).optional(),
});

provisioningRouter.get('/capabilities/store', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  return c.json({ success: true, data: STORE_CREATION_CAPABILITIES });
});

provisioningRouter.post('/store/create-request', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const body = await c.req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues }, 400);

  const { platform, botId, payload, userConsent } = parsed.data;
  if (!userConsent) {
    return c.json({ success: false, error: 'Explicit user consent is required for provisioning actions' }, 400);
  }

  const capability = STORE_CREATION_CAPABILITIES[platform];
  if (!capability) return c.json({ success: false, error: `Unsupported platform ${platform}` }, 400);
  if (!capability.supported) {
    return c.json({ success: false, error: capability.notes }, 400);
  }

  const db = getDb();
  const id = `apv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  db.prepare(
    'INSERT INTO approvals (id, tenant_id, bot_id, platform, action, risk_level, policy_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, auth.tenantId, botId ?? 'system', platform, 'store_create', 'critical', 'provisioning_explicit_approval', 'pending', now);

  logAudit({
    tenantId: auth.tenantId,
    userId: auth.userId,
    botId,
    platform,
    action: 'provisioning_request',
    result: 'pending',
    riskLevel: 'critical',
    details: JSON.stringify({ approvalId: id, payload: payload ?? {} }),
  });

  return c.json({ success: true, data: { approvalId: id, status: 'pending' } }, 201);
});

provisioningRouter.post('/store/resolve/:approvalId', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const body = await c.req.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues }, 400);

  const approvalId = c.req.param('approvalId');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id, platform, status FROM approvals WHERE id = ?').get(approvalId) as { id: string; tenant_id: string; platform: string; status: string } | undefined;
  if (!row) return c.json({ success: false, error: 'Approval not found' }, 404);
  if (row.tenant_id !== auth.tenantId) return c.json({ success: false, error: 'Not authorized' }, 403);

  const status = parsed.data.approved ? 'approved' : 'rejected';
  db.prepare('UPDATE approvals SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?').run(status, Date.now(), auth.userId, approvalId);

  logAudit({
    tenantId: auth.tenantId,
    userId: auth.userId,
    platform: row.platform,
    action: 'provisioning_resolve',
    result: status,
    riskLevel: 'critical',
    details: JSON.stringify({ approvalId, reason: parsed.data.reason ?? '' }),
  });

  return c.json({ success: true, data: { approvalId, status } });
});

provisioningRouter.post('/store/execute/:approvalId', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const approvalId = c.req.param('approvalId');
  const db = getDb();
  const row = db.prepare('SELECT id, tenant_id, platform, status FROM approvals WHERE id = ?').get(approvalId) as { id: string; tenant_id: string; platform: string; status: string } | undefined;
  if (!row) return c.json({ success: false, error: 'Approval not found' }, 404);
  if (row.tenant_id !== auth.tenantId) return c.json({ success: false, error: 'Not authorized' }, 403);
  if (row.status !== 'approved') return c.json({ success: false, error: 'Provisioning requires approved request' }, 400);

  const capability = STORE_CREATION_CAPABILITIES[row.platform];
  if (!capability?.supported) return c.json({ success: false, error: capability?.notes ?? 'Unsupported platform' }, 400);

  const storeId = `store_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const receiptId = `receipt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  logAudit({
    tenantId: auth.tenantId,
    userId: auth.userId,
    platform: row.platform,
    action: 'provisioning_execute',
    result: 'success',
    riskLevel: 'critical',
    details: JSON.stringify({ approvalId, storeId, receiptId }),
  });

  return c.json({
    success: true,
    data: {
      approvalId,
      platform: row.platform,
      storeId,
      receiptId,
      executedAt: Date.now(),
      mode: capability.mode,
    },
  });
});
