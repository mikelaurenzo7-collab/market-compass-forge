import { Hono } from 'hono';
import { INTEGRATIONS } from '@beastbots/shared';
import type { IntegrationCategory, IntegrationStatus } from '@beastbots/shared';

export const integrationsRouter = new Hono();

const VALID_CATEGORIES: IntegrationCategory[] = ['trading', 'ecommerce', 'social'];
const VALID_STATUSES: IntegrationStatus[] = ['planned', 'beta', 'ga'];

/** GET /api/integrations
 *  Optional query params:
 *    category  — filter by category (trading | ecommerce | social)
 *    status    — filter by status   (planned | beta | ga)
 */
integrationsRouter.get('/', (c) => {
  const rawCategory = c.req.query('category');
  const rawStatus = c.req.query('status');

  let results = INTEGRATIONS;

  if (rawCategory) {
    if (!VALID_CATEGORIES.includes(rawCategory as IntegrationCategory)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
          },
        },
        422
      );
    }
    results = results.filter((i) => i.category === rawCategory);
  }

  if (rawStatus) {
    if (!VALID_STATUSES.includes(rawStatus as IntegrationStatus)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          },
        },
        422
      );
    }
    results = results.filter((i) => i.status === rawStatus);
  }

  return c.json({ success: true, data: results });
});
