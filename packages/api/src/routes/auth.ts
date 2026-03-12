import { Hono } from 'hono';
import { z } from 'zod';
import crypto from 'node:crypto';
import { hashSync, compareSync } from 'bcryptjs';
import { jwtVerify } from 'jose';
import { getDb } from '../lib/db.js';
import { signAccessToken, issueRefreshToken, verifyAccessToken, verifyAuthHeader, rotateRefreshToken, revokeRefreshTokensForUser } from '../lib/auth.js';
import { logAudit } from '../lib/audit.js';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { sendEmail, passwordResetEmail } from './notifications.js';

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

  // Send email verification
  const verificationRaw = crypto.randomBytes(32).toString('hex');
  const verificationHash = crypto.createHash('sha256').update(verificationRaw).digest('hex');
  db.prepare('UPDATE users SET email_verification_token = ?, email_verification_sent_at = ? WHERE id = ?')
    .run(verificationHash, now, userId);

  const verifyUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/verify-email?token=${verificationRaw}`;
  sendEmail({
    to: email,
    subject: 'Verify your BeastBots email',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #10b981; font-size: 24px; margin-bottom: 16px;">Welcome to BeastBots!</h1>
        <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6;">Verify your email address to unlock all features.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 24px 0;">Verify Email</a>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">BeastBots — Deploy AI-powered autonomous bots</p>
      </div>
    `,
  }).catch(err => console.error('[Email] Verification email failed:', err));

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
    'SELECT id, email, password_hash, display_name, mfa_enabled, failed_login_attempts, locked_until, email_verified FROM users WHERE email = ?'
  ).get(email) as any;

  // Account lockout check
  if (user?.locked_until && Date.now() < user.locked_until) {
    const minutesLeft = Math.ceil((user.locked_until - Date.now()) / 60_000);
    return c.json({ success: false, error: `Account is locked. Try again in ${minutesLeft} minute(s).` }, 423);
  }

  if (!user || !compareSync(password, user.password_hash)) {
    // Increment failed attempts
    if (user) {
      const attempts = (user.failed_login_attempts ?? 0) + 1;
      const LOCKOUT_THRESHOLD = 5;
      const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
      if (attempts >= LOCKOUT_THRESHOLD) {
        db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?')
          .run(attempts, Date.now() + LOCKOUT_DURATION_MS, Date.now(), user.id);
      } else {
        db.prepare('UPDATE users SET failed_login_attempts = ?, updated_at = ? WHERE id = ?')
          .run(attempts, Date.now(), user.id);
      }
    }
    // audit failed login
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

  // Reset failed attempts on successful password check
  if (user.failed_login_attempts > 0) {
    db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?')
      .run(Date.now(), user.id);
  }

  const membership = db.prepare(
    'SELECT tenant_id, role FROM tenant_members WHERE user_id = ?'
  ).get(user.id) as any;

  const tenantId = membership?.tenant_id ?? '';

  // If MFA is enabled, return mfaRequired challenge instead of tokens
  if (user.mfa_enabled) {
    logAudit({
      tenantId,
      userId: user.id,
      action: 'login_mfa_challenge',
      result: 'success',
      riskLevel: 'medium',
      details: email,
    });
    return c.json({
      success: true,
      data: {
        mfaRequired: true,
        userId: user.id,
      },
    });
  }

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
      emailVerified: !!user.email_verified,
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
// ─── POST /forgot-password ───────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

authRouter.post('/forgot-password', async (c) => {
  const body = await c.req.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const { email } = parsed.data;
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;

  // Always return success to prevent email enumeration
  if (!user) {
    return c.json({ success: true, data: { message: 'If that email is registered, a reset link has been sent.' } });
  }

  // Invalidate any existing unused tokens for this user
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

  // Generate a secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const id = `prt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const expiresAt = now + 60 * 60 * 1000; // 1 hour

  db.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)'
  ).run(id, user.id, tokenHash, expiresAt, now);

  // In production, send email with: /reset-password?token=<rawToken>
  const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/reset-password?token=${rawToken}`;
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Password Reset] ${email} → ${resetUrl}`);
  }

  // Send the reset email (non-blocking — don't fail the request if email fails)
  const emailTemplate = passwordResetEmail(resetUrl);
  sendEmail({ ...emailTemplate, to: email }).catch((err) => {
    console.error('[Email] Password reset email failed:', err);
  });

  const membership = db.prepare('SELECT tenant_id FROM tenant_members WHERE user_id = ?').get(user.id) as any;
  logAudit({
    tenantId: membership?.tenant_id ?? '',
    userId: user.id,
    action: 'password_reset_request',
    result: 'success',
    riskLevel: 'medium',
    details: email,
  });

  return c.json({
    success: true,
    data: {
      message: 'If that email is registered, a reset link has been sent.',
      // Include token in non-production for testing
      ...(process.env.NODE_ENV !== 'production' ? { resetToken: rawToken } : {}),
    },
  });
});

// ─── POST /reset-password ────────────────────────────────

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

authRouter.post('/reset-password', async (c) => {
  const body = await c.req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const { token, password } = parsed.data;
  const db = getDb();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const resetRow = db.prepare(
    'SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token_hash = ?'
  ).get(tokenHash) as any;

  if (!resetRow) {
    return c.json({ success: false, error: 'Invalid or expired reset link' }, 400);
  }

  if (resetRow.used) {
    return c.json({ success: false, error: 'This reset link has already been used' }, 400);
  }

  if (Date.now() > resetRow.expires_at) {
    return c.json({ success: false, error: 'This reset link has expired. Please request a new one.' }, 400);
  }

  const passwordHash = hashSync(password, 12);

  db.transaction(() => {
    // Update password
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(passwordHash, Date.now(), resetRow.user_id);

    // Mark token as used
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetRow.id);

    // Revoke all refresh tokens (force re-login on all devices)
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(resetRow.user_id);
  })();

  const membership = db.prepare('SELECT tenant_id FROM tenant_members WHERE user_id = ?').get(resetRow.user_id) as any;
  logAudit({
    tenantId: membership?.tenant_id ?? '',
    userId: resetRow.user_id,
    action: 'password_reset_complete',
    result: 'success',
    riskLevel: 'high',
    details: 'Password changed via reset link. All sessions revoked.',
  });

  return c.json({
    success: true,
    data: { message: 'Password has been reset. Please log in with your new password.' },
  });
});
// ─── POST /verify-email ───────────────────────────────────

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

authRouter.post('/verify-email', async (c) => {
  const body = await c.req.json();
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb();
  const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');

  const user = db.prepare(
    'SELECT id, email_verification_token, email_verified FROM users WHERE email_verification_token = ?'
  ).get(tokenHash) as any;

  if (!user) {
    return c.json({ success: false, error: 'Invalid verification link' }, 400);
  }

  if (user.email_verified) {
    return c.json({ success: true, data: { message: 'Email is already verified.' } });
  }

  db.prepare('UPDATE users SET email_verified = 1, email_verification_token = NULL, updated_at = ? WHERE id = ?')
    .run(Date.now(), user.id);

  const membership = db.prepare('SELECT tenant_id FROM tenant_members WHERE user_id = ?').get(user.id) as any;
  logAudit({
    tenantId: membership?.tenant_id ?? '',
    userId: user.id,
    action: 'email_verified',
    result: 'success',
    riskLevel: 'low',
    details: '',
  });

  return c.json({ success: true, data: { message: 'Email verified successfully.' } });
});

// ─── POST /resend-verification ────────────────────────────

authRouter.post('/resend-verification', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();
  const user = db.prepare('SELECT id, email, email_verified FROM users WHERE id = ?').get(auth.userId) as any;
  if (!user) return c.json({ success: false, error: 'User not found' }, 404);
  if (user.email_verified) return c.json({ success: true, data: { message: 'Email is already verified.' } });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  db.prepare('UPDATE users SET email_verification_token = ?, email_verification_sent_at = ?, updated_at = ? WHERE id = ?')
    .run(tokenHash, Date.now(), Date.now(), user.id);

  const verifyUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/verify-email?token=${rawToken}`;
  sendEmail({
    to: user.email,
    subject: 'Verify your BeastBots email',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #10b981; font-size: 24px; margin-bottom: 16px;">Verify Your Email</h1>
        <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6;">Click below to verify your email address.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 24px 0;">Verify Email</a>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">BeastBots — Deploy AI-powered autonomous bots</p>
      </div>
    `,
  }).catch(err => console.error('[Email] Verification email failed:', err));

  return c.json({ success: true, data: { message: 'Verification email sent.' } });
});
// end of file

