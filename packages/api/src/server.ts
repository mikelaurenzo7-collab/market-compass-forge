import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { healthRouter } from './routes/health.js';
import { integrationsRouter } from './routes/integrations.js';
import { pricingRouter } from './routes/pricing.js';
import { authRouter } from './routes/auth.js';
import { approvalsRouter } from './routes/approvals.js';
import { governanceRouter } from './routes/governance.js';
import { billingRouter } from './routes/billing.js';
import { botsRouter } from './routes/bots.js';
import { internalError } from './lib/errors.js';

export const app = new Hono();

// Global middleware
app.use('*', logger());

// Error boundary
app.onError((err, c) => {
  console.error('[beastbots-api] unhandled error', err);
  return internalError(c);
});

// Not found handler
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404);
});

app.get('/', (c) => c.json({ success: true, data: { name: 'BeastBots API', version: '0.1.0' } }));
app.route('/api/health', healthRouter);
app.route('/api/auth', authRouter);
app.route('/api/integrations', integrationsRouter);
app.route('/api/pricing', pricingRouter);
app.route('/api/approvals', approvalsRouter);
app.route('/api/governance', governanceRouter);
app.route('/api/billing', billingRouter);
app.route('/api/bots', botsRouter);

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  const port = Number(process.env.PORT ?? 4000);
  serve({ fetch: app.fetch, port });
  console.log(`BeastBots API listening on http://localhost:${port}`);
}

export default app;
