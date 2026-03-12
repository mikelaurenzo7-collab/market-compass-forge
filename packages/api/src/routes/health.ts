import { Hono } from 'hono';
import { getDb } from '../lib/db.js';

export const healthRouter = new Hono();

healthRouter.get('/', (c) => {
  // Quick DB connectivity check
  let dbOk = false;
  try {
    const row = getDb().prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
    dbOk = row?.ok === 1;
  } catch { /* db down */ }

  const mem = process.memoryUsage();
  const status = dbOk ? 'ok' : 'degraded';

  return c.json({
    success: true,
    data: {
      service: 'beastbots-api',
      status,
      version: '0.1.0',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        database: dbOk ? 'ok' : 'error',
        email: process.env.RESEND_API_KEY ? 'configured' : 'not_configured',
        webhooks: {
          shopify: process.env.SHOPIFY_WEBHOOK_SECRET ? 'configured' : 'not_configured',
          coinbase: process.env.COINBASE_WEBHOOK_SECRET ? 'configured' : 'not_configured',
          alpaca: process.env.ALPACA_WEBHOOK_SECRET ? 'configured' : 'not_configured',
        },
        memory: {
          rssBytes: mem.rss,
          heapUsedBytes: mem.heapUsed,
          heapTotalBytes: mem.heapTotal,
        },
      },
    },
  }, dbOk ? 200 : 503);
});

// Deep health check — also verify tables exist
healthRouter.get('/ready', (c) => {
  try {
    const db = getDb();
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    const tableNames = tables.map(t => t.name);

    const required = ['users', 'tenants', 'bots', 'credentials', 'audit_log', 'approvals'];
    const missing = required.filter(t => !tableNames.includes(t));

    if (missing.length > 0) {
      return c.json({ success: false, error: 'Missing tables', missing }, 503);
    }

    return c.json({ success: true, data: { ready: true, tables: tableNames.length } });
  } catch (err) {
    return c.json({ success: false, error: 'Database not ready' }, 503);
  }
});
