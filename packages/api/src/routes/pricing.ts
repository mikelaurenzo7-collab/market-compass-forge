import { Hono } from 'hono';
import { pricingSummary } from '../lib/plans.js';

export const pricingRouter = new Hono();

pricingRouter.get('/', (c) => c.json({ success: true, data: pricingSummary() }));
