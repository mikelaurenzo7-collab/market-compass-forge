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
  const db = getDb();
  db.prepare('DELETE FROM rate_limits').run();
}

describe('health and probe routes', () => {
  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch {
      // ignore cleanup errors in tests
    }
  });

  it('returns healthy status for /api/health', async () => {
    clearRateLimits();
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
  });

  it('returns liveness status for /healthz', async () => {
    clearRateLimits();
    const response = await app.request('/healthz');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('returns readiness status for /readyz', async () => {
    clearRateLimits();
    const response = await app.request('/readyz');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ready' });
  });

  it('keeps probes available even after global rate limiting is exceeded', async () => {
    clearRateLimits();
    let finalApiHealthStatus = 0;
    for (let i = 0; i < 101; i++) {
      const res = await app.request('/api/health');
      finalApiHealthStatus = res.status;
    }
    expect(finalApiHealthStatus).toBe(429);

    const liveness = await app.request('/healthz');
    const readiness = await app.request('/readyz');
    expect(liveness.status).toBe(200);
    expect(readiness.status).toBe(200);
  });
});
