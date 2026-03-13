import crypto from 'node:crypto';
import { SignJWT, jwtVerify, JWTVerifyResult } from 'jose';
import { getDb } from './db.js';

const JWT_SECRET_RAW = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
};
const jwtSecret = () => new TextEncoder().encode(JWT_SECRET_RAW());
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL ?? '7d';

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function signAccessToken({ userId, tenantId, email }: { userId: string; tenantId: string; email: string; }) {
  return await new SignJWT({ sub: userId, tenantId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .setIssuedAt()
    .sign(jwtSecret());
}

export async function issueRefreshToken({ userId, tenantId }: { userId: string; tenantId: string; }) {
  const token = await new SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .setIssuedAt()
    .sign(jwtSecret());

  const db = getDb();
  const id = uid('rt');
  const now = Date.now();
  // compute expires_at from token TTL (approx) — use Date.now + 7d in ms for DB consistency
  const expiresAt = now + msFromTTL(REFRESH_TOKEN_TTL);
  const tokenHash = hashToken(token);

  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, tenant_id, token_hash, revoked, expires_at, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)'
  ).run(id, userId, tenantId, tokenHash, expiresAt, now);

  return { token, id, expiresAt };
}

function msFromTTL(ttl: string): number {
  // support formats like '15m', '7d', '3600s'
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m) return 0;
  const v = Number(m[1]);
  const unit = m[2];
  switch (unit) {
    case 's': return v * 1000;
    case 'm': return v * 60 * 1000;
    case 'h': return v * 60 * 60 * 1000;
    case 'd': return v * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

export async function rotateRefreshToken(oldToken: string) {
  const db = getDb();
  const oldHash = hashToken(oldToken);

  // Wrap in transaction to prevent race conditions (concurrent refresh requests)
  const result = db.transaction(() => {
    const row = db.prepare('SELECT id, user_id, tenant_id, revoked, expires_at FROM refresh_tokens WHERE token_hash = ?').get(oldHash) as { id: string; user_id: string; tenant_id: string; revoked: number; expires_at: number } | undefined;
    if (!row) throw new Error('refresh_not_found');
    if (row.revoked) throw new Error('refresh_revoked');
    if (Date.now() > row.expires_at) throw new Error('refresh_expired');

    // revoke old and set replaced_by
    const replacedBy = uid('rt');
    db.prepare('UPDATE refresh_tokens SET revoked = 1, replaced_by = ? WHERE id = ?').run(replacedBy, row.id);

    return { userId: row.user_id, tenantId: row.tenant_id };
  })();

  const newTokenData = await issueRefreshToken({ userId: result.userId, tenantId: result.tenantId });

  const userRow = db.prepare('SELECT email FROM users WHERE id = ?').get(result.userId) as { email: string } | undefined;
  const accessToken = await signAccessToken({ userId: result.userId, tenantId: result.tenantId, email: userRow?.email ?? '' });

  return { accessToken, refreshToken: newTokenData.token };
}

export async function verifyAccessToken(token: string) {
  try {
    const res: JWTVerifyResult = await jwtVerify(token, jwtSecret());
    return res.payload as Record<string, unknown>;
  } catch (e) {
    return null;
  }
}

export async function verifyAuthHeader(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const payload = await verifyAccessToken(token);
  if (!payload?.sub) return null;

  // Ensure user still exists and is member of the tenant in the token
  const db = getDb();
  const userId = payload.sub as string;
  const tenantId = (payload.tenantId as string) ?? '';

  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId) as { id: string; email: string } | undefined;
  if (!user) return null;

  const membership = db.prepare('SELECT tenant_id, role FROM tenant_members WHERE user_id = ? AND tenant_id = ?')
    .get(userId, tenantId) as { tenant_id: string; role: string } | undefined;
  if (!membership) return null;

  return { userId, tenantId: membership.tenant_id, email: user.email, role: membership.role };
}

export async function revokeRefreshTokensForUser(userId: string) {
  const db = getDb();
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(userId);
}
