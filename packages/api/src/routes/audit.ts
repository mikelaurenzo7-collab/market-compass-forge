import { Hono } from 'hono';
import { getDb } from '../lib/db.js';
import { verifyAuthHeader } from '../lib/auth.js';

export const auditRouter = new Hono();

// GET /api/audit – returns tenant-scoped audit log entries
auditRouter.get('/', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();
  const rows = db.prepare(
    'SELECT id, bot_id AS botId, platform, action, result, risk_level AS riskLevel, details, created_at AS timestamp FROM audit_log WHERE tenant_id = ? ORDER BY created_at DESC'
  ).all(auth.tenantId) as any[];

  return c.json({ success: true, data: rows });
});