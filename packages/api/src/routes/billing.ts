import { Hono } from 'hono';
import { z } from 'zod';
import { DEFAULT_PRICING } from '@beastbots/shared';
import { authMiddleware } from '../middleware/auth.js';
import { validationError, notFound } from '../lib/errors.js';

export const billingRouter = new Hono();

/** GET /api/billing/plans — list all available pricing plans. */
billingRouter.get('/plans', (c) => {
  return c.json({ success: true, data: DEFAULT_PRICING });
});

/** GET /api/billing/plans/:family — plans for a specific bot family. */
billingRouter.get('/plans/:family', (c) => {
  const family = c.req.param('family');
  const plans = DEFAULT_PRICING.filter((p) => p.family === family);
  if (plans.length === 0) return notFound(c, `No plans found for family "${family}"`);
  return c.json({ success: true, data: plans });
});

const subscribeSchema = z.object({
  family: z.enum(['trading', 'store', 'social', 'workforce']),
  tier: z.enum(['starter', 'pro', 'enterprise']),
  stripePaymentMethodId: z.string().min(1),
});

/** POST /api/billing/subscribe — initiate a new subscription (scaffold). */
billingRouter.post('/subscribe', authMiddleware, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, 'Request body must be valid JSON');
  }

  const result = subscribeSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, 'Invalid subscription payload', {
      issues: result.error.flatten().fieldErrors,
    });
  }

  const plan = DEFAULT_PRICING.find(
    (p) => p.family === result.data.family && p.tier === result.data.tier
  );
  if (!plan) return notFound(c, 'Plan not found');

  // Scaffold: return a mock subscription object.
  return c.json(
    {
      success: true,
      data: {
        subscriptionId: `sub_scaffold_${crypto.randomUUID().slice(0, 8)}`,
        family: plan.family,
        tier: plan.tier,
        monthlyUsd: plan.monthlyUsd,
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
      },
    },
    201
  );
});
