import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { healthRouter } from './routes/health.js';
import { integrationsRouter } from './routes/integrations.js';
import { pricingRouter } from './routes/pricing.js';

export const app = new Hono();

app.get('/', (c) => c.json({ success: true, data: { name: 'BeastBots API', version: '0.1.0' } }));
app.route('/api/health', healthRouter);
app.route('/api/integrations', integrationsRouter);
app.route('/api/pricing', pricingRouter);

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  const port = Number(process.env.PORT ?? 4000);
  serve({ fetch: app.fetch, port });
  console.log(`BeastBots API listening on http://localhost:${port}`);
}

export default app;
