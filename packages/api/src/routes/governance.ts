import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

export const governanceRouter = new Hono();

/** GET /api/governance/policies — list active safety policies. */
governanceRouter.get('/policies', authMiddleware, (c) => {
  const policies = [
    {
      id: 'max-trade-size',
      description: 'Maximum single-trade size in USD',
      value: 10000,
      editable: true,
    },
    {
      id: 'daily-loss-limit',
      description: 'Daily loss cap in USD before circuit breaker trips',
      value: 2500,
      editable: true,
    },
    {
      id: 'require-approval-above',
      description: 'Require human approval for trades above this USD threshold',
      value: 5000,
      editable: true,
    },
    {
      id: 'kill-switch',
      description: 'Disable all autonomous actions immediately',
      value: false,
      editable: true,
    },
  ];
  return c.json({ success: true, data: policies });
});

/** GET /api/governance/audit-log — immutable audit trail entries (scaffold). */
governanceRouter.get('/audit-log', authMiddleware, (c) => {
  const entries = [
    {
      id: crypto.randomUUID(),
      action: 'BOT_STARTED',
      actor: 'system',
      ts: new Date().toISOString(),
    },
  ];
  return c.json({ success: true, data: entries });
});
