import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tmpDb = path.join(os.tmpdir(), `beastbots-lib-auth-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

import { closeDb, getDb } from '../db.js';
import { signAccessToken, verifyAuthHeader } from '../auth.js';

describe('lib/auth verifyAuthHeader', () => {
  beforeAll(() => {
    const db = getDb();
    const now = Date.now();

    db.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('user_multi', 'multi@example.com', 'fake-hash', 'Multi User', now, now);

    db.prepare(
      'INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('tenant_alpha', 'Alpha Tenant', 'user_multi', 'starter', now);

    db.prepare(
      'INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('tenant_beta', 'Beta Tenant', 'user_multi', 'starter', now);

    db.prepare(
      'INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)'
    ).run('tenant_alpha', 'user_multi', 'member');

    db.prepare(
      'INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)'
    ).run('tenant_beta', 'user_multi', 'admin');
  });

  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch {
      // ignore cleanup errors in tests
    }
  });

  it('uses the tenant in the token for multi-tenant users', async () => {
    const token = await signAccessToken({
      userId: 'user_multi',
      tenantId: 'tenant_beta',
      email: 'multi@example.com',
    });

    const auth = await verifyAuthHeader(`Bearer ${token}`);
    expect(auth).toEqual({
      userId: 'user_multi',
      tenantId: 'tenant_beta',
      email: 'multi@example.com',
      role: 'admin',
    });
  });

  it('rejects tokens for tenants where the user is not a member', async () => {
    const token = await signAccessToken({
      userId: 'user_multi',
      tenantId: 'tenant_unknown',
      email: 'multi@example.com',
    });

    const auth = await verifyAuthHeader(`Bearer ${token}`);
    expect(auth).toBeNull();
  });
});
