import app from '../../server';

describe('auth route', () => {
  it('issues token with valid credentials', async () => {
    const res = await app.request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-1', secret: 'supersecret' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.token).toBe('string');
    expect(body.data.token.length).toBeGreaterThan(0);
    expect(body.data.expiresIn).toBe(3600);
  });

  it('returns 422 for missing tenantId', async () => {
    const res = await app.request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'supersecret' }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('returns 422 for short secret', async () => {
    const res = await app.request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-1', secret: 'short' }),
    });
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid JSON', async () => {
    const res = await app.request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    expect(res.status).toBe(422);
  });
});
