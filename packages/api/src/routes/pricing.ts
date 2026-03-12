import { Hono } from 'hono';
import { pricingSummary, pricingByFamily } from '../lib/plans.js';
import type { BotFamily } from '@beastbots/shared';
import { DEFAULT_PRICING } from '@beastbots/shared';
import { verifyAuthHeader } from '../lib/auth.js';
import { getDb } from '../lib/db.js';

export const pricingRouter = new Hono();

pricingRouter.get('/', (c) => c.json({ success: true, data: pricingSummary() }));

pricingRouter.get('/usage', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();
  const tenant = db.prepare('SELECT plan FROM tenants WHERE id = ?').get(auth.tenantId) as { plan: string } | undefined;
  const tier = (tenant?.plan ?? 'starter') as 'starter' | 'pro' | 'enterprise';

  const families: BotFamily[] = ['trading', 'store', 'social', 'workforce'];
  const usage = families.map((family) => {
    const plan = DEFAULT_PRICING.find((p) => p.family === family && p.tier === tier);
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM bots WHERE tenant_id = ? AND family = ?').get(auth.tenantId, family) as { cnt: number }).cnt;
    return {
      family,
      tier,
      currentBots: count,
      maxBots: plan?.maxBots ?? 1,
      addOnBotUsd: plan?.addOnBotUsd ?? 0,
      monthlyUsd: plan?.monthlyUsd ?? 0,
      canAddMore: count < (plan?.maxBots ?? 1),
    };
  });

  return c.json({ success: true, data: { tier, usage } });
});

pricingRouter.get('/:family', (c) => {
  const family = c.req.param('family') as BotFamily;
  const plans = pricingByFamily(family);
  if (plans.length === 0) {
    return c.json({ success: false, error: `No plans found for family: ${family}` }, 404);
  }
  return c.json({ success: true, data: plans });
});
