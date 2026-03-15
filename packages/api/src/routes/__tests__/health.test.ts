import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const tmpDb = path.join(os.tmpdir(), `beastbots-health-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';
process.env.NODE_ENV = 'test';

import app from '../../server.js';
import { closeDb, getDb } from '../../lib/db.js';

function clearRateLimits() {
  getDb().prepare('DELETE FROM rate_limits').run();
}

describe('health routes', () => {
  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch {
      // ignore cleanup errors in tests
    }
  });

  it('returns healthy status for /api/health', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
  });

  it('returns liveness status for /healthz and skips rate limiting', async () => {
    clearRateLimits();

    for (let i = 0; i < 5; i += 1) {
      const response = await app.request('/healthz');
      expect(response.status).toBe(200);
      const json = await response.json() as { status: string };
      expect(json.status).toBe('ok');
    }

    const row = getDb().prepare('SELECT COUNT(*) as count FROM rate_limits').get() as { count: number };
    expect(row.count).toBe(0);
  });

  it('returns readiness status for /readyz and skips rate limiting', async () => {
    clearRateLimits();

    const response = await app.request('/readyz');
    expect(response.status).toBe(200);
    const json = await response.json() as { status: string };
    expect(json.status).toBe('ready');

    const row = getDb().prepare('SELECT COUNT(*) as count FROM rate_limits').get() as { count: number };
    expect(row.count).toBe(0);
  });
});
