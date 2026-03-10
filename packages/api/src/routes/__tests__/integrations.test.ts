import app from '../../server';

describe('integrations route', () => {
  it('returns all integrations', async () => {
    const res = await app.request('/api/integrations');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('filters by category=trading', async () => {
    const res = await app.request('/api/integrations?category=trading');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((i: { category: string }) => i.category === 'trading')).toBe(true);
  });

  it('filters by category=ecommerce', async () => {
    const res = await app.request('/api/integrations?category=ecommerce');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((i: { category: string }) => i.category === 'ecommerce')).toBe(true);
  });

  it('filters by status=beta', async () => {
    const res = await app.request('/api/integrations?status=beta');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((i: { status: string }) => i.status === 'beta')).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('returns 422 for invalid category', async () => {
    const res = await app.request('/api/integrations?category=invalid');
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('returns 422 for invalid status', async () => {
    const res = await app.request('/api/integrations?status=unknown');
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
