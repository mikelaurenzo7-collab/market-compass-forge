process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'test-encryption-key-32bytes!';

import app from '../../server';

describe('health route', () => {
  it('returns healthy status', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
  });
});
