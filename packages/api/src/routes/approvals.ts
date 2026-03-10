import { Hono } from 'hono';
import { z } from 'zod';
import type { ApprovalItem } from '@beastbots/shared';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthIdentity } from '../middleware/auth.js';
import { validationError, notFound } from '../lib/errors.js';

// Expose the variable type so TS knows what c.get('identity') returns.
type AppVars = { identity: AuthIdentity };

export const approvalsRouter = new Hono<{ Variables: AppVars }>();

// In-memory store for the scaffold; replace with a persistent DB.
const store = new Map<string, ApprovalItem>();

const createSchema = z.object({
  botId: z.string().min(1),
  action: z.string().min(1),
  payload: z.record(z.unknown()),
});

/** GET /api/approvals — list pending approval items for the tenant. */
approvalsRouter.get('/', authMiddleware, (c) => {
  const items = [...store.values()].filter((i) => i.status === 'pending');
  return c.json({ success: true, data: items });
});

/** POST /api/approvals — create a new approval request. */
approvalsRouter.post('/', authMiddleware, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, 'Request body must be valid JSON');
  }

  const result = createSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, 'Invalid approval payload', {
      issues: result.error.flatten().fieldErrors,
    });
  }

  const item: ApprovalItem = {
    id: crypto.randomUUID(),
    tenantId: (c.get('identity') as AuthIdentity | undefined)?.tenantId ?? 'unknown',
    botId: result.data.botId,
    action: result.data.action,
    payload: result.data.payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  store.set(item.id, item);
  return c.json({ success: true, data: item }, 201);
});

/** PATCH /api/approvals/:id — approve or reject an item. */
approvalsRouter.patch('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const item = store.get(id);
  if (!item) return notFound(c, 'Approval item not found');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, 'Request body must be valid JSON');
  }

  const resolveSchema = z.object({ status: z.enum(['approved', 'rejected']) });
  const result = resolveSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, 'status must be "approved" or "rejected"');
  }

  item.status = result.data.status;
  item.resolvedAt = new Date().toISOString();
  item.resolvedBy = 'scaffold-user';
  store.set(id, item);
  return c.json({ success: true, data: item });
});
