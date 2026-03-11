import { Hono } from 'hono';
import { z } from 'zod';
import { hashSync, compareSync } from 'bcryptjs';
import { jwtVerify } from 'jose';
import { getDb } from '../lib/db.js';
import { signAccessToken, issueRefreshToken, verifyAccessToken, verifyAuthHeader, rotateRefreshToken, revokeRefreshTokensForUser } from '../lib/auth.js';
import { logAudit } from '../lib/audit.js';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';

export const authRouter = new Hono();

const REFRESH_COOKIE = 'bb_refresh';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function setRefreshCookie(c: any, token: string) {
  setCookie(c, REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api/auth',
    maxAge: REFRESH_MAX_AGE,
  });
}

function clearRefreshCookie(c: any) {
  deleteCookie(c, REFRESH_COOKIE, { path: '/api/auth' });
}

function uid(): string {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Schemas ──────────────────────────────────────────────────

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── POST /signup ─────────────────────────────────────────────

authRouter.post('/signup', async (c) => {
  const body = await c.req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const { email, password, displayName } = parsed.data;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return c.json({ success: false, error: 'Email already registered' }, 409);
  }

  const userId = uid();
  const tenantId = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const passwordHash = hashSync(password, 12);

  db.transaction(() => {
    db.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, email, passwordHash, displayName ?? email.split('@')[0], now, now);

    db.prepare(
      'INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(tenantId, `${displayName ?? email.split('@')[0]}'s Workspace`, userId, 'starter', now);

    db.prepare(
      'INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)'
    ).run(tenantId, userId, 'owner');

    db.prepare(
      'INSERT INTO onboarding (user_id, completed, current_step) VALUES (?, 0, 0)'
    ).run(userId);
  })();

  // audit signup
  logAudit({
    tenantId,
    userId,
    action: 'signup',
    result: 'success',
    riskLevel: 'low',
    details: email,
  });

  const accessToken = await signAccessToken({ userId, tenantId, email });
  const refreshTokenData = await issueRefreshToken({ userId, tenantId });

  setRefreshCookie(c, refreshTokenData.token);

  return c.json({
    success: true,
    data: {
      user: { id: userId, email, displayName: displayName ?? email.split('@')[0] },
      tenantId,
      accessToken,
      onboardingRequired: true,
    },
  }, 201);
});

authRouter.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const { email, password } = parsed.data;
  const db = getDb();

  const user = db.prepare(
    'SELECT id, email, password_hash, display_name FROM users WHERE email = ?'
  ).get(email) as any;

  if (!user || !compareSync(password, user.password_hash)) {
    // audit failed login (only if we can resolve a tenant)
    const failedTenantId = user?.id
      ? (db.prepare('SELECT tenant_id FROM tenant_members WHERE user_id = ?').get(user.id) as any)?.tenant_id
      : null;
    if (failedTenantId) {
      logAudit({
        tenantId: failedTenantId,
        userId: user?.id,
        action: 'login',
        result: 'failure',
        riskLevel: 'medium',
        details: 'invalid_credentials',
      });
    }
    return c.json({ success: false, error: 'Invalid email or password' }, 401);
  }

  const membership = db.prepare(
    'SELECT tenant_id, role FROM tenant_members WHERE user_id = ?'
  ).get(user.id) as any;

  const tenantId = membership?.tenant_id ?? '';

  // audit successful login
  logAudit({
    tenantId,
    userId: user.id,
    action: 'login',
    result: 'success',
    riskLevel: 'medium',
    details: email,
  });

  const onboarding = db.prepare(
    'SELECT completed FROM onboarding WHERE user_id = ?'
  ).get(user.id) as any;

  const accessToken = await signAccessToken({ userId: user.id, tenantId, email: user.email });
  const refreshTokenData = await issueRefreshToken({ userId: user.id, tenantId });

  setRefreshCookie(c, refreshTokenData.token);

  return c.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, displayName: user.display_name },
      tenantId,
      accessToken,
      onboardingRequired: !onboarding?.completed,
    },
  });
});

// ─── POST /refresh ────────────────────────────────────────────

authRouter.post('/refresh', async (c) => {
  // Read refresh token from HttpOnly cookie, fall back to body for backward compat
  const cookieToken = getCookie(c, REFRESH_COOKIE);
  let bodyToken: string | undefined;
  try {
    const body = await c.req.json();
    bodyToken = body?.refreshToken;
  } catch { /* empty body is fine when cookie is present */ }

  const token = cookieToken ?? bodyToken;
  if (!token) {
    return c.json({ success: false, error: 'Missing refresh token' }, 400);
  }

  try {
    const payload = await verifyAccessToken(token);
    if (!payload || (payload as any).type !== 'refresh') {
      return c.json({ success: false, error: 'Invalid token type' }, 401);
    }

    const userId = payload.sub as string;
    const db = getDb();
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId) as any;
    if (!user) return c.json({ success: false, error: 'User not found' }, 401);

    const membership = db.prepare('SELECT tenant_id FROM tenant_members WHERE user_id = ?').get(userId) as any;

    const rotation = await rotateRefreshToken(token);

    const accessToken = await signAccessToken({ userId, tenantId: membership?.tenant_id ?? '', email: user.email });

    setRefreshCookie(c, rotation.refreshToken);

    logAudit({
      tenantId: membership?.tenant_id ?? '',
      userId,
      action: 'refresh_token',
      result: 'success',
      riskLevel: 'low',
      details: '',
    });
    return c.json({ success: true, data: { accessToken } });
  } catch {
    clearRefreshCookie(c);
    return c.json({ success: false, error: 'Invalid or expired refresh token' }, 401);
  }
});

// ─── GET /me ──────────────────────────────────────────────────

authRouter.get('/me', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();
  const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(auth.userId) as any;
  if (!user) return c.json({ success: false, error: 'User not found' }, 401);

  const onboarding = db.prepare('SELECT completed, current_step, selected_family, first_integration FROM onboarding WHERE user_id = ?').get(auth.userId) as any;

  const connectedPlatforms = db.prepare('SELECT platform, status FROM credentials WHERE tenant_id = ?').all(auth.tenantId) as any[];

  return c.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, displayName: user.display_name, createdAt: user.created_at },
      tenantId: auth.tenantId,
      role: (auth as any).role ?? 'member',
      onboarding: {
        completed: !!onboarding?.completed,
        currentStep: onboarding?.current_step ?? 0,
        selectedFamily: onboarding?.selected_family ?? null,
        firstIntegration: onboarding?.first_integration ?? null,
      },
      connectedPlatforms,
    },
  });
});

// ─── POST /logout ─────────────────────────────────────────────

authRouter.post('/logout', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (auth?.userId) {
    await revokeRefreshTokensForUser(auth.userId);
    logAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: 'logout',
      result: 'success',
      riskLevel: 'low',
      details: '',
    });
  }
  clearRefreshCookie(c);
  return c.json({ success: true, data: { message: 'Logged out' } });
});

// ─── Auth Middleware Helper ───────────────────────────────────

// Auth helpers are implemented in ../lib/auth.js

// end of file

