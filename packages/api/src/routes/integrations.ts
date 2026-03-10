import { Hono } from 'hono';
import { INTEGRATIONS } from '@beastbots/shared';

export const integrationsRouter = new Hono();

integrationsRouter.get('/', (c) => c.json({ success: true, data: INTEGRATIONS }));
