process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';

import app from '../../server';

describe('health routes', () => {
  it('returns healthy API status', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
  });

  it('returns liveness probe status', async () => {
    const response = await app.request('/healthz');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ status: 'ok' });
  });

  it('returns readiness probe status when DB is available', async () => {
    const response = await app.request('/readyz');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ status: 'ready' });
  });
});
