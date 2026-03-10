import app from '../../server';

describe('health route', () => {
  it('returns healthy status', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
  });
});
