import { Hono } from 'hono';
import { pricingSummary, pricingByFamily } from '../lib/plans.js';
import type { BotFamily } from '@beastbots/shared';

export const pricingRouter = new Hono();

pricingRouter.get('/', (c) => c.json({ success: true, data: pricingSummary() }));

pricingRouter.get('/:family', (c) => {
  const family = c.req.param('family') as BotFamily;
  const plans = pricingByFamily(family);
  if (plans.length === 0) {
    return c.json({ success: false, error: `No plans found for family: ${family}` }, 404);
  }
  return c.json({ success: true, data: plans });
});
