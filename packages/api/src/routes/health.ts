import { Hono } from 'hono';

export const healthRouter = new Hono();

healthRouter.get('/', (c) => c.json({ success: true, data: { service: 'beastbots-api', status: 'ok' } }));
