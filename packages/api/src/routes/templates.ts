import { Hono } from 'hono';
import { z } from 'zod';
import { BOT_TEMPLATES, DEFAULT_PRICING, INTEGRATIONS, getTemplateById } from '@beastbots/shared';
import type { BotFamily } from '@beastbots/shared';
import { verifyAuthHeader } from '../lib/auth.js';
import { getDb } from '../lib/db.js';
import { logAudit } from '../lib/audit.js';

export const templatesRouter = new Hono();

const deployTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  platform: z.string().min(1).max(50).optional(),
  credentialId: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

// GET /api/templates — list all templates, optionally filter by family/platform/difficulty
templatesRouter.get('/', (c) => {
  const family = c.req.query('family') as BotFamily | undefined;
  const platform = c.req.query('platform');
  const difficulty = c.req.query('difficulty') as 'beginner' | 'intermediate' | 'advanced' | undefined;

  let results = [...BOT_TEMPLATES];

  if (family) results = results.filter(t => t.family === family);
  if (platform) results = results.filter(t => t.platforms.includes(platform));
  if (difficulty) results = results.filter(t => t.difficulty === difficulty);

  return c.json({ success: true, data: results });
});

// GET /api/templates/:id — get single template by ID
templatesRouter.get('/:id', (c) => {
  const template = getTemplateById(c.req.param('id'));
  if (!template) return c.json({ success: false, error: 'Template not found' }, 404);
  return c.json({ success: true, data: template });
});

// POST /api/templates/:id/deploy — create a bot from template defaults with optional overrides
templatesRouter.post('/:id/deploy', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const template = getTemplateById(c.req.param('id'));
  if (!template) return c.json({ success: false, error: 'Template not found' }, 404);

  const body = await c.req.json();
  const parsed = deployTemplateSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues }, 400);

  const db = getDb();
  const selectedPlatform = parsed.data.platform ?? template.platforms[0];
  if (!template.platforms.includes(selectedPlatform)) {
    return c.json({ success: false, error: `Template does not support platform: ${selectedPlatform}` }, 400);
  }

  const validPlatform = INTEGRATIONS.find((i) => i.id === selectedPlatform);
  if (!validPlatform) {
    return c.json({ success: false, error: `Unknown platform: ${selectedPlatform}` }, 400);
  }

  const tenant = db.prepare('SELECT plan FROM tenants WHERE id = ?').get(auth.tenantId) as { plan: string } | undefined;
  const tier = (tenant?.plan ?? 'starter') as 'starter' | 'pro' | 'enterprise';
  const planDef = DEFAULT_PRICING.find((p) => p.family === template.family && p.tier === tier);
  if (planDef) {
    const currentCount = db.prepare('SELECT COUNT(*) as cnt FROM bots WHERE tenant_id = ? AND family = ?').get(auth.tenantId, template.family) as { cnt: number };
    if (currentCount.cnt >= planDef.maxBots) {
      return c.json({
        success: false,
        error: `${tier.charAt(0).toUpperCase() + tier.slice(1)} plan allows ${planDef.maxBots} ${template.family} bot${planDef.maxBots > 1 ? 's' : ''}.`,
        code: 'PLAN_BOT_LIMIT',
        currentCount: currentCount.cnt,
        maxBots: planDef.maxBots,
        tier,
        family: template.family,
      }, 403);
    }
  }

  if (parsed.data.credentialId) {
    const cred = db.prepare('SELECT id FROM credentials WHERE id = ? AND tenant_id = ? AND platform = ?').get(parsed.data.credentialId, auth.tenantId, selectedPlatform) as { id: string } | undefined;
    if (!cred) {
      return c.json({ success: false, error: 'Invalid credential — must belong to your account and match the bot platform' }, 400);
    }
  }

  const id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const config = { ...template.config, ...(parsed.data.config ?? {}) };
  const name = parsed.data.name ?? `${template.name} Bot`;

  db.prepare('INSERT INTO bots (id, tenant_id, name, family, platform, status, config, safety_config, credential_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, auth.tenantId, name, template.family, selectedPlatform, 'idle', JSON.stringify(config), JSON.stringify({}), parsed.data.credentialId ?? null, now, now);

  logAudit({
    tenantId: auth.tenantId,
    action: 'deploy_template',
    result: 'success',
    riskLevel: 'low',
    details: JSON.stringify({ botId: id, templateId: template.id, platform: selectedPlatform }),
  });

  return c.json({
    success: true,
    data: {
      id,
      tenantId: auth.tenantId,
      name,
      family: template.family,
      platform: selectedPlatform,
      status: 'idle',
      config,
      createdAt: now,
      updatedAt: now,
      templateId: template.id,
    },
  }, 201);
});
