import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

const tmpDb = path.join(os.tmpdir(), `beastbots-test-health-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
process.env.DATABASE_PATH = tmpDb;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';

import app from '../../server.js';
import { closeDb, getDb } from '../../lib/db.js';

describe('health probes', () => {
  afterAll(() => {
    try {
      closeDb();
      if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    } catch {
      // ignore cleanup errors in test teardown
    }
  });

  it('returns healthy API route', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
  });

  it('returns liveness and readiness probes', async () => {
    const liveResponse = await app.request('/healthz');
    expect(liveResponse.status).toBe(200);
    expect(await liveResponse.json()).toEqual({ status: 'ok' });

    const readyResponse = await app.request('/readyz');
    expect(readyResponse.status).toBe(200);
    expect(await readyResponse.json()).toEqual({ status: 'ready' });
  });

  it('does not apply global rate limits to health probes', async () => {
    const db = getDb();
    const before = (db.prepare('SELECT COUNT(*) as count FROM rate_limits').get() as { count: number }).count;

    for (let index = 0; index < 105; index += 1) {
      const response = await app.request('/healthz');
      expect(response.status).toBe(200);
    }

    const readyResponse = await app.request('/readyz');
    expect(readyResponse.status).toBe(200);

    const after = (db.prepare('SELECT COUNT(*) as count FROM rate_limits').get() as { count: number }).count;
    expect(after).toBe(before);
  });

  it('returns 503 when readiness DB check throws', async () => {
    const db = getDb();
    const prepareSpy = vi.spyOn(db, 'prepare').mockImplementation(() => {
      throw new Error('simulated-db-failure');
    });

    try {
      const response = await app.request('/readyz');
      expect(response.status).toBe(503);
      const json = await response.json() as { status: string; reason: string };
      expect(json.status).toBe('not_ready');
      expect(json.reason).toContain('simulated-db-failure');
    } finally {
      prepareSpy.mockRestore();
    }
  });

  it('returns 503 when readiness DB check is unexpected', async () => {
    const db = getDb();
    const prepareSpy = vi.spyOn(db, 'prepare').mockReturnValue({
      get: () => ({ ok: 0 }),
    } as any);

    try {
      const response = await app.request('/readyz');
      expect(response.status).toBe(503);
      const json = await response.json() as { status: string; reason: string };
      expect(json.status).toBe('not_ready');
      expect(json.reason).toContain('unexpected result');
    } finally {
      prepareSpy.mockRestore();
    }
  });
});
