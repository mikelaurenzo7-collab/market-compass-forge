import app from '../../server';

describe('pricing route', () => {
  it('returns all pricing plans', async () => {
    const res = await app.request('/api/pricing');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(12); // 4 families × 3 tiers
  });

  it('includes enterprise plans', async () => {
    const res = await app.request('/api/pricing');
    const body = await res.json();
    const enterprise = body.data.filter((p: { tier: string }) => p.tier === 'enterprise');
    expect(enterprise).toHaveLength(4);
  });
});

describe('billing/plans route', () => {
  it('returns all plans at /api/billing/plans', async () => {
    const res = await app.request('/api/billing/plans');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(12);
  });

  it('filters plans by family', async () => {
    const res = await app.request('/api/billing/plans/trading');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((p: { family: string }) => p.family === 'trading')).toBe(true);
    expect(body.data).toHaveLength(3);
  });

  it('returns 404 for unknown family', async () => {
    const res = await app.request('/api/billing/plans/unknown');
    expect(res.status).toBe(404);
  });
});
