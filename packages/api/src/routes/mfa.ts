/**
 * MFA (Multi-Factor Authentication) routes.
 *
 * Supports TOTP (Time-based One-Time Password) via authenticator apps
 * like Google Authenticator, Authy, or 1Password.
 *
 * Flow:
 * 1. POST /mfa/setup → returns secret + QR URI (user scans in app)
 * 2. POST /mfa/verify-setup → user submits code to confirm setup
 * 3. Login flow: if mfa_enabled, login returns mfaRequired=true
 * 4. POST /mfa/verify → submit TOTP code to complete login
 * 5. POST /mfa/disable → disable MFA (requires current TOTP code)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import crypto from 'node:crypto';
import { hashSync, compareSync } from 'bcryptjs';
import { getDb } from '../lib/db.js';
import { verifyAuthHeader, signAccessToken, issueRefreshToken } from '../lib/auth.js';
import { logAudit } from '../lib/audit.js';
import { setCookie } from 'hono/cookie';

// ─── RFC 6238 TOTP implementation (no external deps) ──────────

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }
  return result;
}

function base32Decode(encoded: string): Buffer {
  let bits = '';
  for (const char of encoded.toUpperCase()) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue; // skip padding '='
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTOTPSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function generateTOTP(secret: string, timeStep = 30, digits = 6, offset = 0): string {
  const time = Math.floor(Date.now() / 1000 / timeStep) + offset;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(Math.floor(time / 0x100000000), 0);
  timeBuffer.writeUInt32BE(time & 0xFFFFFFFF, 4);

  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();

  const offsetByte = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offsetByte] & 0x7f) << 24) |
    ((hmac[offsetByte + 1] & 0xff) << 16) |
    ((hmac[offsetByte + 2] & 0xff) << 8) |
    (hmac[offsetByte + 3] & 0xff);

  return (code % 10 ** digits).toString().padStart(digits, '0');
}

function verifyTOTP(token: string, secret: string, window = 1): boolean {
  for (let i = -window; i <= window; i++) {
    if (generateTOTP(secret, 30, 6, i) === token) return true;
  }
  return false;
}

function totpKeyURI(email: string, issuer: string, secret: string): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export { generateTOTP, verifyTOTP };

export const mfaRouter = new Hono();

const REFRESH_COOKIE = 'bb_refresh';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

function setRefreshCookie(c: any, token: string) {
  setCookie(c, REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api/auth',
    maxAge: REFRESH_MAX_AGE,
  });
}

// ─── POST /mfa/setup — generate TOTP secret ──────────────────

mfaRouter.post('/setup', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();
  const user = db.prepare('SELECT id, email, mfa_enabled FROM users WHERE id = ?').get(auth.userId) as { id: string; email: string; mfa_enabled: number } | undefined;
  if (!user) return c.json({ success: false, error: 'User not found' }, 404);

  if (user.mfa_enabled) {
    return c.json({ success: false, error: 'MFA is already enabled. Disable it first to reconfigure.' }, 400);
  }

  // Generate TOTP secret
  const secret = generateTOTPSecret();

  // Store secret (not yet enabled — user must verify first)
  db.prepare('UPDATE users SET totp_secret = ?, updated_at = ? WHERE id = ?')
    .run(secret, Date.now(), user.id);

  // Generate otpauth URI for QR code
  const otpauthUrl = totpKeyURI(user.email, 'BeastBots', secret);

  logAudit({
    tenantId: auth.tenantId,
    userId: auth.userId,
    action: 'mfa_setup_initiated',
    result: 'success',
    riskLevel: 'medium',
    details: '',
  });

  return c.json({
    success: true,
    data: {
      secret,
      otpauthUrl,
      // Frontend can generate a QR code from otpauthUrl
    },
  });
});

// ─── POST /mfa/verify-setup — confirm setup with code ────────

const verifySetupSchema = z.object({
  code: z.string().length(6, 'TOTP code must be 6 digits'),
});

mfaRouter.post('/verify-setup', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const body = await c.req.json();
  const parsed = verifySetupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb();
  const user = db.prepare('SELECT id, totp_secret, mfa_enabled FROM users WHERE id = ?').get(auth.userId) as { id: string; totp_secret: string | null; mfa_enabled: number } | undefined;
  if (!user) return c.json({ success: false, error: 'User not found' }, 404);
  if (!user.totp_secret) return c.json({ success: false, error: 'MFA setup not initiated' }, 400);
  if (user.mfa_enabled) return c.json({ success: false, error: 'MFA is already enabled' }, 400);

  // Verify the code
  const isValid = verifyTOTP(parsed.data.code, user.totp_secret);
  if (!isValid) {
    return c.json({ success: false, error: 'Invalid code. Please try again with a fresh code from your authenticator.' }, 400);
  }

  // Generate backup codes (8 codes, 8 characters each)
  const backupCodes: string[] = [];
  const hashedBackupCodes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString('hex');
    backupCodes.push(code);
    hashedBackupCodes.push(hashSync(code, 10));
  }

  // Enable MFA
  db.prepare(
    'UPDATE users SET mfa_enabled = 1, mfa_backup_codes = ?, updated_at = ? WHERE id = ?'
  ).run(JSON.stringify(hashedBackupCodes), Date.now(), user.id);

  logAudit({
    tenantId: auth.tenantId,
    userId: auth.userId,
    action: 'mfa_enabled',
    result: 'success',
    riskLevel: 'high',
    details: 'MFA enabled via TOTP authenticator',
  });

  return c.json({
    success: true,
    data: {
      backupCodes,
      message: 'MFA is now enabled. Save these backup codes in a secure place — they cannot be shown again.',
    },
  });
});

// ─── POST /mfa/verify — complete login with TOTP ─────────────

const verifyLoginSchema = z.object({
  userId: z.string().min(1),
  code: z.string().min(1, 'Code is required'),
});

mfaRouter.post('/verify', async (c) => {
  const body = await c.req.json();
  const parsed = verifyLoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb();
  const user = db.prepare(
    'SELECT id, email, display_name, totp_secret, mfa_enabled, mfa_backup_codes FROM users WHERE id = ?'
  ).get(parsed.data.userId) as { id: string; email: string; display_name: string; totp_secret: string | null; mfa_enabled: number; mfa_backup_codes: string | null } | undefined;

  if (!user || !user.mfa_enabled || !user.totp_secret) {
    return c.json({ success: false, error: 'Invalid request' }, 400);
  }

  const { code } = parsed.data;

  // Try TOTP first
  let isValid = verifyTOTP(code, user.totp_secret);

  // If TOTP fails, try backup codes
  if (!isValid && user.mfa_backup_codes) {
    const backupCodes: string[] = JSON.parse(user.mfa_backup_codes);
    for (let i = 0; i < backupCodes.length; i++) {
      if (compareSync(code, backupCodes[i])) {
        isValid = true;
        // Remove used backup code
        backupCodes.splice(i, 1);
        db.prepare('UPDATE users SET mfa_backup_codes = ?, updated_at = ? WHERE id = ?')
          .run(JSON.stringify(backupCodes), Date.now(), user.id);
        break;
      }
    }
  }

  if (!isValid) {
    return c.json({ success: false, error: 'Invalid verification code' }, 401);
  }

  const membership = db.prepare('SELECT tenant_id FROM tenant_members WHERE user_id = ?').get(user.id) as { tenant_id: string } | undefined;
  const tenantId = membership?.tenant_id ?? '';

  const onboarding = db.prepare('SELECT completed FROM onboarding WHERE user_id = ?').get(user.id) as { completed: number } | undefined;

  const accessToken = await signAccessToken({ userId: user.id, tenantId, email: user.email });
  const refreshTokenData = await issueRefreshToken({ userId: user.id, tenantId });

  setRefreshCookie(c, refreshTokenData.token);

  logAudit({
    tenantId,
    userId: user.id,
    action: 'mfa_verify',
    result: 'success',
    riskLevel: 'medium',
    details: '',
  });

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

// ─── POST /mfa/disable — disable MFA ─────────────────────────

const disableSchema = z.object({
  code: z.string().length(6, 'TOTP code must be 6 digits'),
});

mfaRouter.post('/disable', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const body = await c.req.json();
  const parsed = disableSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0].message }, 400);
  }

  const db = getDb();
  const user = db.prepare('SELECT id, totp_secret, mfa_enabled FROM users WHERE id = ?').get(auth.userId) as { id: string; totp_secret: string | null; mfa_enabled: number } | undefined;
  if (!user) return c.json({ success: false, error: 'User not found' }, 404);
  if (!user.mfa_enabled) return c.json({ success: false, error: 'MFA is not enabled' }, 400);
  if (!user.totp_secret) return c.json({ success: false, error: 'MFA not properly configured' }, 400);

  const isValid = verifyTOTP(parsed.data.code, user.totp_secret);
  if (!isValid) {
    return c.json({ success: false, error: 'Invalid code' }, 401);
  }

  db.prepare(
    'UPDATE users SET mfa_enabled = 0, totp_secret = NULL, mfa_backup_codes = NULL, updated_at = ? WHERE id = ?'
  ).run(Date.now(), auth.userId);

  logAudit({
    tenantId: auth.tenantId,
    userId: auth.userId,
    action: 'mfa_disabled',
    result: 'success',
    riskLevel: 'high',
    details: 'MFA disabled',
  });

  return c.json({ success: true, data: { message: 'MFA has been disabled.' } });
});

// ─── GET /mfa/status — check MFA status ──────────────────────

mfaRouter.get('/status', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Not authenticated' }, 401);

  const db = getDb();
  const user = db.prepare('SELECT mfa_enabled FROM users WHERE id = ?').get(auth.userId) as { mfa_enabled: number } | undefined;
  if (!user) return c.json({ success: false, error: 'User not found' }, 404);

  return c.json({ success: true, data: { mfaEnabled: !!user.mfa_enabled } });
});
