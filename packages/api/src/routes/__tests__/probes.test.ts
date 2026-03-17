import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { closeDb, getDb } from '../../lib/db.js';

const tmpDb = path.join(
  os.tmpdir(),
  `beastbots-probes-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';
process.env.NODE_ENV = 'test';

import app from '../../server.js';

describe('health probes', () => {
  afterAll(() => {
    closeDb();
  });

  it('GET /healthz returns ok and bypasses rate limiting', async () => {
    const db = getDb();
    db.prepare('DELETE FROM rate_limits').run();

    for (let i = 0; i < 120; i += 1) {
      const res = await app.request('/healthz');
      expect(res.status).toBe(200);
      const body = await res.json() as { status: string };
      expect(body.status).toBe('ok');
    }

    const row = db.prepare('SELECT COUNT(*) AS count FROM rate_limits').get() as { count: number };
    expect(row.count).toBe(0);
  });

  it('GET /readyz returns ready when DB check succeeds', async () => {
    const res = await app.request('/readyz');
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('ready');
  });

  it('GET /readyz returns 503 with reason when DB check throws', async () => {
    const db = getDb();
    const prepareSpy = vi.spyOn(db, 'prepare').mockImplementationOnce(() => {
      throw new Error('db unavailable');
    });

    const res = await app.request('/readyz');
    prepareSpy.mockRestore();

    expect(res.status).toBe(503);
    const body = await res.json() as { status: string; reason: string };
    expect(body.status).toBe('not_ready');
    expect(body.reason).toContain('db unavailable');
  });
});
