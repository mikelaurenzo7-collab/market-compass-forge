import app from '../../server';

describe('health route', () => {
  it('returns healthy status', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
  });
});

describe('root route', () => {
  it('returns API metadata', async () => {
    const response = await app.request('/');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('BeastBots API');
  });
});
