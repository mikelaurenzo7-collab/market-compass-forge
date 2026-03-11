import { Hono } from 'hono';
import { z } from 'zod';
import type { BotFamily } from '@beastbots/shared';
import {
  createDefaultBudget,
  createDefaultCircuitBreaker,
  createDefaultPolicies,
  getAuditLog,
  getPendingApprovals,
  resolveApproval,
} from '@beastbots/shared';
import { verifyAuthHeader } from '../lib/auth.js';

export const safetyRouter = new Hono();

// ─── Get Default Safety Config ────────────────────────────────

safetyRouter.get('/defaults/:family', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const family = c.req.param('family') as BotFamily;
  const validFamilies: BotFamily[] = ['trading', 'store', 'social', 'workforce'];
  if (!validFamilies.includes(family)) {
    return c.json({ success: false, error: `Invalid family: ${family}` }, 400);
  }

  return c.json({
    success: true,
    data: {
      policies: createDefaultPolicies(family),
      budget: createDefaultBudget(family),
      circuitBreaker: createDefaultCircuitBreaker(),
    },
  });
});

// ─── Audit Log ────────────────────────────────────────────────

safetyRouter.get('/audit', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);
  const limit = Number(c.req.query('limit') ?? '100');
  const entries = getAuditLog(auth.tenantId, Math.min(limit, 500));
  return c.json({ success: true, data: entries });
});

// ─── Approval Queue ───────────────────────────────────────────

safetyRouter.get('/approvals', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);
  const pending = getPendingApprovals(auth.tenantId);
  return c.json({ success: true, data: pending });
});

const resolveSchema = z.object({
  approved: z.boolean(),
  resolvedBy: z.string().min(1).max(200),
});

safetyRouter.post('/approvals/:id/resolve', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const body = await c.req.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues }, 400);
  }

  const result = resolveApproval(
    c.req.param('id'),
    parsed.data.approved,
    parsed.data.resolvedBy
  );

  if (!result) {
    return c.json({ success: false, error: 'Approval request not found' }, 404);
  }

  return c.json({ success: true, data: result });
});
