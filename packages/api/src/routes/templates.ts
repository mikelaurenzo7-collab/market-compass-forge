import { Hono } from 'hono';
import { BOT_TEMPLATES, getTemplateById, getTemplatesByFamily, getTemplatesByPlatform } from '@beastbots/shared';
import type { BotFamily } from '@beastbots/shared';

export const templatesRouter = new Hono();

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
