import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Isolated temp database
const tmpDb = path.join(os.tmpdir(), `beastbots-test-sprint3-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32bytes!';

import app from '../../server';
import { getDb, closeDb } from '../../lib/db';
import { signAccessToken } from '../../lib/auth';
import { generateTOTP } from '../mfa';

// ─── Setup ────────────────────────────────────────────────────

let db: ReturnType<typeof getDb>;
let userId: string;
let tenantId: string;
let authHeader: string;

function clearRateLimits() {
  db.prepare('DELETE FROM rate_limits').run();
}

beforeAll(async () => {
  db = getDb();
  userId = `user-s3-${Date.now()}`;
  tenantId = `tenant-s3-${Date.now()}`;
  const now = Date.now();
  db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, 'sprint3@example.com', 'hash', 'Sprint3 Tester', now, now);
  db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(tenantId, 'Sprint3 Tenant', userId, 'starter', now);
  db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
    .run(tenantId, userId, 'owner');

  const tok = await signAccessToken({ userId, tenantId, email: 'sprint3@example.com' });
  authHeader = `Bearer ${tok}`;
});

afterAll(() => {
  closeDb();
});

// ────────────────────────────────────────────────────────────────
// Account Lockout
// ────────────────────────────────────────────────────────────────

describe('Account Lockout', () => {
  const lockoutEmail = 'lockout-test@example.com';
  const lockoutPassword = 'CorrectPass123!';

  beforeAll(async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockoutEmail, password: lockoutPassword }),
    });
    expect(res.status).toBe(201);
  });

  it('increments failed_login_attempts on wrong password', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockoutEmail, password: 'WrongPass!' }),
    });
    expect(res.status).toBe(401);

    const user = db.prepare('SELECT failed_login_attempts FROM users WHERE email = ?').get(lockoutEmail) as any;
    expect(user.failed_login_attempts).toBe(1);
  });

  it('locks account after 5 failed attempts', async () => {
    // Already have 1 failure from previous test — do 4 more
    for (let i = 0; i < 4; i++) {
      clearRateLimits();
      await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lockoutEmail, password: 'WrongPass!' }),
      });
    }

    const user = db.prepare('SELECT failed_login_attempts, locked_until FROM users WHERE email = ?').get(lockoutEmail) as any;
    expect(user.failed_login_attempts).toBe(5);
    expect(user.locked_until).toBeGreaterThan(Date.now());
  });

  it('returns 423 when account is locked', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockoutEmail, password: lockoutPassword }),
    });
    expect(res.status).toBe(423);
    const json = await res.json() as any;
    expect(json.error).toMatch(/locked/i);
  });

  it('allows login after lockout expires', async () => {
    // Manually set locked_until to the past
    db.prepare('UPDATE users SET locked_until = ?, failed_login_attempts = 0 WHERE email = ?')
      .run(Date.now() - 1000, lockoutEmail);

    clearRateLimits();
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockoutEmail, password: lockoutPassword }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.accessToken).toBeDefined();
  });

  it('resets failed_login_attempts on successful login', async () => {
    const user = db.prepare('SELECT failed_login_attempts FROM users WHERE email = ?').get(lockoutEmail) as any;
    expect(user.failed_login_attempts).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────
// Email Verification
// ────────────────────────────────────────────────────────────────

describe('Email Verification', () => {
  const verifyEmail = 'verify-test@example.com';
  const verifyPassword = 'VerifyPass123!';
  let verifyAccessToken: string;
  let verifyUserId: string;

  beforeAll(async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: verifyEmail, password: verifyPassword }),
    });
    const json = await res.json() as any;
    verifyAccessToken = json.data.accessToken;
    verifyUserId = json.data.user.id;
  });

  it('stores email_verification_token on signup', () => {
    const user = db.prepare('SELECT email_verification_token, email_verified FROM users WHERE id = ?').get(verifyUserId) as any;
    expect(user.email_verification_token).toBeTruthy();
    expect(user.email_verified).toBe(0);
  });

  it('login response includes emailVerified field', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: verifyEmail, password: verifyPassword }),
    });
    const json = await res.json() as any;
    expect(json.data.emailVerified).toBe(false);
  });

  it('POST /verify-email verifies with valid token', async () => {
    // We need to get the raw token — we stored the hash in DB so we generate our own
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    db.prepare('UPDATE users SET email_verification_token = ? WHERE id = ?').run(tokenHash, verifyUserId);

    clearRateLimits();
    const res = await app.request('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);

    const user = db.prepare('SELECT email_verified FROM users WHERE id = ?').get(verifyUserId) as any;
    expect(user.email_verified).toBe(1);
  });

  it('POST /verify-email returns success for already verified', async () => {
    // Re-set the token so we can call verify again
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    db.prepare('UPDATE users SET email_verification_token = ?, email_verified = 1 WHERE id = ?').run(tokenHash, verifyUserId);

    clearRateLimits();
    const res = await app.request('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.message).toMatch(/already verified/i);
  });

  it('POST /verify-email rejects invalid token', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'bogus-token-that-does-not-exist' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /resend-verification sends new token', async () => {
    // Mark user as unverified for this test
    db.prepare('UPDATE users SET email_verified = 0 WHERE id = ?').run(verifyUserId);

    clearRateLimits();
    const res = await app.request('/api/auth/resend-verification', {
      method: 'POST',
      headers: { Authorization: `Bearer ${verifyAccessToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.message).toMatch(/sent/i);
  });

  it('POST /resend-verification returns success if already verified', async () => {
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(verifyUserId);

    clearRateLimits();
    const res = await app.request('/api/auth/resend-verification', {
      method: 'POST',
      headers: { Authorization: `Bearer ${verifyAccessToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.message).toMatch(/already verified/i);
  });
});

// ────────────────────────────────────────────────────────────────
// MFA (Multi-Factor Authentication)
// ────────────────────────────────────────────────────────────────

describe('MFA', () => {
  it('GET /mfa/status returns false when MFA is not enabled', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/mfa/status', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.mfaEnabled).toBe(false);
  });

  it('GET /mfa/status rejects unauthenticated request', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/mfa/status');
    expect(res.status).toBe(401);
  });

  let totpSecret: string;

  it('POST /mfa/setup returns secret and otpauthUrl', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/mfa/setup', {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.secret).toBeDefined();
    expect(json.data.otpauthUrl).toMatch(/otpauth:\/\/totp\//);
    expect(json.data.qrCodeUrl).toBe(json.data.otpauthUrl);
    totpSecret = json.data.secret;
  });

  it('POST /mfa/verify-setup rejects wrong code', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/mfa/verify-setup', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '000000' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.error).toMatch(/invalid code/i);
  });

  let backupCodes: string[];

  it('POST /mfa/verify-setup enables MFA with valid TOTP code', async () => {
    // Generate a valid TOTP code from the secret
    const validCode = generateTOTP(totpSecret);

    clearRateLimits();
    const res = await app.request('/api/auth/mfa/verify-setup', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: validCode }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.backupCodes).toHaveLength(8);
    backupCodes = json.data.backupCodes;

    // Verify in DB
    const user = db.prepare('SELECT mfa_enabled FROM users WHERE id = ?').get(userId) as any;
    expect(user.mfa_enabled).toBe(1);
  });

  it('GET /mfa/status returns true after enabling', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/mfa/status', {
      headers: { Authorization: authHeader },
    });
    const json = await res.json() as any;
    expect(json.data.mfaEnabled).toBe(true);
  });

  it('POST /mfa/setup rejects when MFA is already enabled', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/mfa/setup', {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.error).toMatch(/already enabled/i);
  });

  it('login returns mfaRequired when MFA is enabled', async () => {
    // Create a user with password and MFA enabled (use the seeded sprint3@example.com)
    // The main userId already has MFA enabled — but they never had a real password hash.
    // We need a user with a real bcrypt password hash + MFA enabled.

    const { hashSync } = await import('bcryptjs') as any;
    const mfaLoginEmail = 'mfa-login@example.com';
    const mfaLoginPassword = 'MfaLogin123!';
    const mfaLoginUserId = `user-mfa-login-${Date.now()}`;
    const mfaLoginTenantId = `tenant-mfa-login-${Date.now()}`;
    const now = Date.now();

    db.prepare('INSERT INTO users (id, email, password_hash, display_name, mfa_enabled, totp_secret, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)')
      .run(mfaLoginUserId, mfaLoginEmail, hashSync(mfaLoginPassword, 12), 'MFA Login User', totpSecret, now, now);
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(mfaLoginTenantId, 'MFA Login Tenant', mfaLoginUserId, 'starter', now);
    db.prepare('INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
      .run(mfaLoginTenantId, mfaLoginUserId, 'owner');

    clearRateLimits();
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mfaLoginEmail, password: mfaLoginPassword }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.mfaRequired).toBe(true);
    expect(json.data.userId).toBe(mfaLoginUserId);
    // Should NOT have accessToken yet
    expect(json.data.accessToken).toBeUndefined();
  });

  it('POST /mfa/verify completes login with valid TOTP code', async () => {
    const mfaLoginUser = db.prepare("SELECT id, totp_secret FROM users WHERE email = 'mfa-login@example.com'").get() as any;
    const code = generateTOTP(mfaLoginUser.totp_secret);

    clearRateLimits();
    const res = await app.request('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mfaLoginUser.id, code }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.accessToken).toBeDefined();
    expect(json.data.user.email).toBe('mfa-login@example.com');
  });

  it('POST /mfa/verify rejects invalid code', async () => {
    const mfaLoginUser = db.prepare("SELECT id FROM users WHERE email = 'mfa-login@example.com'").get() as any;

    clearRateLimits();
    const res = await app.request('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mfaLoginUser.id, code: '999999' }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /mfa/verify accepts backup code (one-time use)', async () => {
    const mfaLoginUser = db.prepare("SELECT id FROM users WHERE email = 'mfa-login@example.com'").get() as any;

    // Set backup codes from our known list on the mfa-login user
    const { hashSync: hSync } = await import('bcryptjs') as any;
    const hashedBackups = backupCodes.map(c => hSync(c, 10));
    db.prepare('UPDATE users SET mfa_backup_codes = ? WHERE id = ?')
      .run(JSON.stringify(hashedBackups), mfaLoginUser.id);

    const backupCode = backupCodes[0];

    clearRateLimits();
    const res = await app.request('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mfaLoginUser.id, code: backupCode }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.accessToken).toBeDefined();

    // Backup code should be consumed — using same code again should fail
    clearRateLimits();
    const res2 = await app.request('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mfaLoginUser.id, code: backupCode }),
    });
    expect(res2.status).toBe(401);
  });

  it('POST /mfa/disable rejects wrong code', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/mfa/disable', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '000000' }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /mfa/disable disables MFA with valid code', async () => {
    const user = db.prepare('SELECT totp_secret FROM users WHERE id = ?').get(userId) as any;
    const code = generateTOTP(user.totp_secret);

    clearRateLimits();
    const res = await app.request('/api/auth/mfa/disable', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);

    // Verify MFA is disabled
    const updated = db.prepare('SELECT mfa_enabled, totp_secret, mfa_backup_codes FROM users WHERE id = ?').get(userId) as any;
    expect(updated.mfa_enabled).toBe(0);
    expect(updated.totp_secret).toBeNull();
    expect(updated.mfa_backup_codes).toBeNull();
  });

  it('POST /mfa/disable rejects when MFA not enabled', async () => {
    clearRateLimits();
    const res = await app.request('/api/auth/mfa/disable', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '123456' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.error).toMatch(/not enabled/i);
  });
});

// ────────────────────────────────────────────────────────────────
// Audit CSV Export
// ────────────────────────────────────────────────────────────────

describe('Audit CSV Export', () => {
  beforeAll(() => {
    // Seed some audit records
    const now = Date.now();
    db.prepare(
      'INSERT INTO audit_log (id, tenant_id, bot_id, platform, action, result, risk_level, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('audit-csv-1', tenantId, 'bot-1', 'binance', 'trade_executed', 'success', 'medium', 'BTC/USDT buy', now);
    db.prepare(
      'INSERT INTO audit_log (id, tenant_id, bot_id, platform, action, result, risk_level, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('audit-csv-2', tenantId, 'bot-1', 'binance', 'position_closed', 'success', 'low', 'Details with "quotes"', now + 1);
  });

  it('GET /api/audit/export returns CSV with correct headers', async () => {
    clearRateLimits();
    const res = await app.request('/api/audit/export', {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/csv/);
    expect(res.headers.get('content-disposition')).toMatch(/attachment.*\.csv/);

    const csv = await res.text();
    const lines = csv.split('\n');
    expect(lines[0]).toBe('ID,Bot ID,Platform,Action,Result,Risk Level,Details,Timestamp');
    expect(lines.length).toBeGreaterThanOrEqual(3); // header + 2 data rows
  });

  it('CSV rows contain correct data', async () => {
    clearRateLimits();
    const res = await app.request('/api/audit/export', {
      headers: { Authorization: authHeader },
    });
    const csv = await res.text();
    expect(csv).toContain('trade_executed');
    expect(csv).toContain('position_closed');
    expect(csv).toContain('BTC/USDT buy');
  });

  it('CSV properly escapes quotes in details', async () => {
    clearRateLimits();
    const res = await app.request('/api/audit/export', {
      headers: { Authorization: authHeader },
    });
    const csv = await res.text();
    // Double-quoted details with escaped inner quotes
    expect(csv).toContain('""quotes""');
  });

  it('GET /api/audit/export rejects unauthenticated request', async () => {
    clearRateLimits();
    const res = await app.request('/api/audit/export');
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────────────────────
// Bot Edit (PATCH endpoint)
// ────────────────────────────────────────────────────────────────

describe('Bot Edit', () => {
  let botId: string;

  beforeAll(() => {
    botId = `bot-edit-${Date.now()}`;
    const now = Date.now();
    db.prepare(
      'INSERT INTO bots (id, tenant_id, name, family, platform, config, safety_config, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(botId, tenantId, 'Edit Test Bot', 'trading', 'binance', JSON.stringify({ strategies: ['momentum'] }), JSON.stringify({}), 'stopped', now, now);
  });

  it('PATCH /api/bots/:id updates bot name', async () => {
    clearRateLimits();
    const res = await app.request(`/api/bots/${botId}`, {
      method: 'PATCH',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed Bot' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);

    const bot = db.prepare('SELECT name FROM bots WHERE id = ?').get(botId) as any;
    expect(bot.name).toBe('Renamed Bot');
  });

  it('PATCH /api/bots/:id updates config', async () => {
    clearRateLimits();
    const newConfig = { strategies: ['mean_reversion'], maxPositionSizeUsd: 500, stopLossPercent: 3 };
    const res = await app.request(`/api/bots/${botId}`, {
      method: 'PATCH',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: newConfig }),
    });
    expect(res.status).toBe(200);

    const bot = db.prepare('SELECT config FROM bots WHERE id = ?').get(botId) as any;
    const config = JSON.parse(bot.config);
    expect(config.strategies).toContain('mean_reversion');
    expect(config.maxPositionSizeUsd).toBe(500);
  });

  it('PATCH /api/bots/:id rejects invalid bot id', async () => {
    clearRateLimits();
    const res = await app.request('/api/bots/nonexistent-bot', {
      method: 'PATCH',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Should Fail' }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('PATCH /api/bots/:id rejects unauthenticated request', async () => {
    clearRateLimits();
    const res = await app.request(`/api/bots/${botId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'No Auth' }),
    });
    expect(res.status).toBe(401);
  });
});

// ────────────────────────────────────────────────────────────────
// Migration 006 — Schema validation
// ────────────────────────────────────────────────────────────────

describe('Migration 006 Schema', () => {
  it('users table has MFA columns', () => {
    const cols = db.prepare("PRAGMA table_info(users)").all() as any[];
    const colNames = cols.map((c: any) => c.name);
    expect(colNames).toContain('mfa_enabled');
    expect(colNames).toContain('totp_secret');
    expect(colNames).toContain('mfa_backup_codes');
  });

  it('users table has lockout columns', () => {
    const cols = db.prepare("PRAGMA table_info(users)").all() as any[];
    const colNames = cols.map((c: any) => c.name);
    expect(colNames).toContain('failed_login_attempts');
    expect(colNames).toContain('locked_until');
  });

  it('users table has email verification columns', () => {
    const cols = db.prepare("PRAGMA table_info(users)").all() as any[];
    const colNames = cols.map((c: any) => c.name);
    expect(colNames).toContain('email_verified');
    expect(colNames).toContain('email_verification_token');
    expect(colNames).toContain('email_verification_sent_at');
  });
});
