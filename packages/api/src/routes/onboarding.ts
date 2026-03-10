import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../lib/db.js';
import { verifyAuthHeader } from '../lib/auth.js';

export const onboardingRouter = new Hono();

const updateSchema = z.object({
  currentStep: z.number().min(0).max(4).optional(),
  selectedFamily: z.enum(['trading', 'store', 'social']).optional(),
  firstIntegration: z.string().optional(),
  firstBotId: z.string().optional(),
  completed: z.boolean().optional(),
});

// ─── GET / — Get onboarding state ────────────────────────────

onboardingRouter.get('/', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();
  const state = db.prepare(
    'SELECT completed, current_step, selected_family, first_bot_id, first_integration, completed_at FROM onboarding WHERE user_id = ?'
  ).get(auth.userId) as {
    completed: number;
    current_step: number;
    selected_family: string | null;
    first_bot_id: string | null;
    first_integration: string | null;
    completed_at: number | null;
  } | undefined;

  if (!state) {
    return c.json({
      success: true,
      data: { completed: false, currentStep: 0, selectedFamily: null, firstBotId: null, firstIntegration: null },
    });
  }

  return c.json({
    success: true,
    data: {
      completed: !!state.completed,
      currentStep: state.current_step,
      selectedFamily: state.selected_family,
      firstBotId: state.first_bot_id,
      firstIntegration: state.first_integration,
      completedAt: state.completed_at,
    },
  });
});

// ─── PATCH / — Update onboarding state ───────────────────────

onboardingRouter.patch('/', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb();
  const updates = parsed.data;

  if (updates.currentStep !== undefined) {
    db.prepare('UPDATE onboarding SET current_step = ? WHERE user_id = ?')
      .run(updates.currentStep, auth.userId);
  }
  if (updates.selectedFamily !== undefined) {
    db.prepare('UPDATE onboarding SET selected_family = ? WHERE user_id = ?')
      .run(updates.selectedFamily, auth.userId);
  }
  if (updates.firstIntegration !== undefined) {
    db.prepare('UPDATE onboarding SET first_integration = ? WHERE user_id = ?')
      .run(updates.firstIntegration, auth.userId);
  }
  if (updates.firstBotId !== undefined) {
    db.prepare('UPDATE onboarding SET first_bot_id = ? WHERE user_id = ?')
      .run(updates.firstBotId, auth.userId);
  }
  if (updates.completed) {
    db.prepare('UPDATE onboarding SET completed = 1, completed_at = ? WHERE user_id = ?')
      .run(Date.now(), auth.userId);
  }

  return c.json({ success: true, data: { updated: true } });
});

// ─── POST /skip — Skip onboarding entirely ──────────────────

onboardingRouter.post('/skip', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();
  db.prepare('UPDATE onboarding SET completed = 1, completed_at = ? WHERE user_id = ?')
    .run(Date.now(), auth.userId);

  return c.json({ success: true, data: { skipped: true } });
});
