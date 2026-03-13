import { Hono } from 'hono';
import { getDb } from '../lib/db.js';
import { verifyAuthHeader } from '../lib/auth.js';

export const auditRouter = new Hono();

// GET /api/audit – returns tenant-scoped audit log entries
auditRouter.get('/', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const limit = Math.min(Number(c.req.query('limit') ?? 200), 1000);
  const offset = Number(c.req.query('offset') ?? 0);

  const db = getDb();
  const rows = db.prepare(
    'SELECT id, bot_id AS botId, platform, action, result, risk_level AS riskLevel, details, created_at AS timestamp FROM audit_log WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(auth.tenantId, limit, offset) as { id: string; botId: string | null; platform: string | null; action: string; result: string; riskLevel: string; details: string | null; timestamp: number }[];

  return c.json({ success: true, data: rows });
});

// GET /api/audit/export — CSV export for compliance
auditRouter.get('/export', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();
  const rows = db.prepare(
    'SELECT id, bot_id, platform, action, result, risk_level, details, created_at FROM audit_log WHERE tenant_id = ? ORDER BY created_at DESC'
  ).all(auth.tenantId) as { id: string; bot_id: string | null; platform: string | null; action: string; result: string; risk_level: string; details: string | null; created_at: number }[];
  const headers = ['ID', 'Bot ID', 'Platform', 'Action', 'Result', 'Risk Level', 'Details', 'Timestamp'];
  const csvRows = [headers.join(',')];

  /** Escape CSV cell to prevent formula injection */
  function csvCell(val: string): string {
    // Prefix cells starting with formula-trigger chars
    if (val.length > 0 && '=+-@\t\r'.includes(val[0])) {
      val = "'" + val;
    }
    return `"${val.replace(/"/g, '""')}"`;
  }

  for (const row of rows) {
    const timestamp = new Date(row.created_at).toISOString();
    csvRows.push([
      csvCell(row.id),
      csvCell(row.bot_id ?? ''),
      csvCell(row.platform ?? ''),
      csvCell(row.action),
      csvCell(row.result),
      csvCell(row.risk_level),
      csvCell(row.details ?? ''),
      csvCell(timestamp),
    ].join(','));
  }

  return new Response(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="beastbots-audit-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
});