import { Hono } from 'hono';
import { z } from 'zod';
import type {
  BotInstanceConfig,
  BotSubtype,
  BotStrategy,
  UserRiskProfile,
  RiskLevel,
  AutonomyLevel,
} from '@beastbots/shared';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthIdentity } from '../middleware/auth.js';
import { validationError, notFound } from '../lib/errors.js';

type AppVars = { identity: AuthIdentity };

export const botsRouter = new Hono<{ Variables: AppVars }>();

// In-memory store — replace with a persistent DB in production.
const store = new Map<string, BotInstanceConfig>();

// ─── Validation schemas ───────────────────────────────────────────────────────

const TRADING_SUBTYPES = ['crypto', 'stocks', 'predictions'] as const;
const STORE_SUBTYPES = ['shopify', 'amazon', 'etsy', 'square', 'woocommerce', 'ebay'] as const;
const SOCIAL_SUBTYPES = ['x', 'tiktok', 'instagram', 'facebook', 'linkedin'] as const;

const TRADING_STRATEGIES = [
  'dca', 'momentum', 'mean-reversion', 'breakout', 'arbitrage', 'grid',
] as const;
const STORE_STRATEGIES = [
  'dynamic-pricing', 'inventory-restock', 'ad-campaign', 'product-promotion', 'review-response',
] as const;
const SOCIAL_STRATEGIES = [
  'content-schedule', 'engagement-boost', 'ad-promotion', 'trend-monitor', 'influencer-outreach',
] as const;

const ALL_SUBTYPES = [...TRADING_SUBTYPES, ...STORE_SUBTYPES, ...SOCIAL_SUBTYPES] as const;
const ALL_STRATEGIES = [...TRADING_STRATEGIES, ...STORE_STRATEGIES, ...SOCIAL_STRATEGIES] as const;

const riskProfileSchema = z.object({
  riskLevel: z.enum(['conservative', 'moderate', 'aggressive'] satisfies [RiskLevel, ...RiskLevel[]]),
  autonomyLevel: z.enum(['supervised', 'semi-autonomous', 'fully-autonomous'] satisfies [AutonomyLevel, ...AutonomyLevel[]]),
  maxActionUsd: z.number().positive(),
  dailyLossLimitUsd: z.number().positive(),
  budgetUsd: z.number().positive(),
  requireApprovalAboveUsd: z.number().nonnegative(),
});

const createBotSchema = z.object({
  name: z.string().min(1).max(80),
  family: z.enum(['trading', 'store', 'social']),
  subtype: z.enum(ALL_SUBTYPES),
  strategies: z.array(z.enum(ALL_STRATEGIES)).min(1),
  riskProfile: riskProfileSchema,
});

const updateConfigSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  strategies: z.array(z.enum(ALL_STRATEGIES)).min(1).optional(),
  riskProfile: riskProfileSchema.partial().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validateSubtypeForFamily(
  family: 'trading' | 'store' | 'social',
  subtype: string
): boolean {
  if (family === 'trading') return (TRADING_SUBTYPES as readonly string[]).includes(subtype);
  if (family === 'store') return (STORE_SUBTYPES as readonly string[]).includes(subtype);
  if (family === 'social') return (SOCIAL_SUBTYPES as readonly string[]).includes(subtype);
  return false;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/bots
 * List all bot instances for the authenticated tenant.
 */
botsRouter.get('/', authMiddleware, (c) => {
  const tenantId = (c.get('identity') as AuthIdentity).tenantId;
  const bots = [...store.values()].filter((b) => b.tenantId === tenantId);
  return c.json({ success: true, data: bots });
});

/**
 * POST /api/bots
 * Create a new bot instance. This is how a user "connects" a bot so it starts
 * producing. The bot starts in a disabled state — call /start to activate it.
 */
botsRouter.post('/', authMiddleware, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, 'Request body must be valid JSON');
  }

  const result = createBotSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, 'Invalid bot configuration', {
      issues: result.error.flatten().fieldErrors,
    });
  }

  const { family, subtype, name, strategies, riskProfile } = result.data;

  if (!validateSubtypeForFamily(family, subtype)) {
    return validationError(
      c,
      `Subtype "${subtype}" is not valid for family "${family}". ` +
        `Valid subtypes: ${family === 'trading' ? TRADING_SUBTYPES.join(', ') : family === 'store' ? STORE_SUBTYPES.join(', ') : SOCIAL_SUBTYPES.join(', ')}`
    );
  }

  const now = new Date().toISOString();
  const tenantId = (c.get('identity') as AuthIdentity).tenantId;

  const bot: BotInstanceConfig = {
    id: crypto.randomUUID(),
    tenantId,
    family,
    subtype: subtype as BotSubtype,
    name,
    strategies: strategies as BotStrategy[],
    riskProfile: riskProfile as UserRiskProfile,
    enabled: false,
    createdAt: now,
    updatedAt: now,
  };

  store.set(bot.id, bot);
  return c.json({ success: true, data: bot }, 201);
});

/**
 * GET /api/bots/:id
 * Get a specific bot instance.
 */
botsRouter.get('/:id', authMiddleware, (c) => {
  const id = c.req.param('id');
  const tenantId = (c.get('identity') as AuthIdentity).tenantId;
  const bot = store.get(id);
  if (!bot || bot.tenantId !== tenantId) return notFound(c, 'Bot not found');
  return c.json({ success: true, data: bot });
});

/**
 * PATCH /api/bots/:id/config
 * Update name, strategies, or risk profile of a bot.
 * The user is the boss — they can always update their own risk guardrails.
 */
botsRouter.patch('/:id/config', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const tenantId = (c.get('identity') as AuthIdentity).tenantId;
  const bot = store.get(id);
  if (!bot || bot.tenantId !== tenantId) return notFound(c, 'Bot not found');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, 'Request body must be valid JSON');
  }

  const result = updateConfigSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, 'Invalid update payload', {
      issues: result.error.flatten().fieldErrors,
    });
  }

  if (result.data.name !== undefined) bot.name = result.data.name;
  if (result.data.strategies !== undefined) {
    bot.strategies = result.data.strategies as BotStrategy[];
  }
  if (result.data.riskProfile !== undefined) {
    bot.riskProfile = { ...bot.riskProfile, ...result.data.riskProfile } as UserRiskProfile;
  }
  bot.updatedAt = new Date().toISOString();
  store.set(id, bot);
  return c.json({ success: true, data: bot });
});

/**
 * POST /api/bots/:id/start
 * Enable the bot — it will begin executing its strategy loop.
 * Trading bots run 24/7; store and social bots run on their configured interval.
 */
botsRouter.post('/:id/start', authMiddleware, (c) => {
  const id = c.req.param('id');
  const tenantId = (c.get('identity') as AuthIdentity).tenantId;
  const bot = store.get(id);
  if (!bot || bot.tenantId !== tenantId) return notFound(c, 'Bot not found');

  if (bot.enabled) {
    return c.json({ success: true, data: bot, message: 'Bot already running' });
  }

  bot.enabled = true;
  bot.updatedAt = new Date().toISOString();
  store.set(id, bot);
  return c.json({ success: true, data: bot });
});

/**
 * POST /api/bots/:id/stop
 * Disable the bot — halts all autonomous actions immediately.
 */
botsRouter.post('/:id/stop', authMiddleware, (c) => {
  const id = c.req.param('id');
  const tenantId = (c.get('identity') as AuthIdentity).tenantId;
  const bot = store.get(id);
  if (!bot || bot.tenantId !== tenantId) return notFound(c, 'Bot not found');

  bot.enabled = false;
  bot.updatedAt = new Date().toISOString();
  store.set(id, bot);
  return c.json({ success: true, data: bot });
});
