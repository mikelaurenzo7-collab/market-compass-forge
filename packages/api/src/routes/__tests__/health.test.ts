process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';

import app from '../../server';

describe('health routes', () => {
  it('returns healthy status', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
  });

  it('returns ok for liveness probe', async () => {
    const response = await app.request('/healthz');
    expect(response.status).toBe(200);
    const json = await response.json() as { status: string };
    expect(json.status).toBe('ok');
  });

  it('returns ready for readiness probe when db is available', async () => {
    const response = await app.request('/readyz');
    expect(response.status).toBe(200);
    const json = await response.json() as { status: string };
    expect(json.status).toBe('ready');
  });
});
