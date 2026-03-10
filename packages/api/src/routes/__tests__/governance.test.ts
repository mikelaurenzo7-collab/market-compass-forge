import app from '../../server';

const AUTH_HEADER = { Authorization: 'Bearer scaffold-token' };

describe('governance route', () => {
  it('requires auth', async () => {
    const res = await app.request('/api/governance/policies');
    expect(res.status).toBe(401);
  });

  it('returns safety policies', async () => {
    const res = await app.request('/api/governance/policies', { headers: AUTH_HEADER });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    const ids = body.data.map((p: { id: string }) => p.id);
    expect(ids).toContain('kill-switch');
    expect(ids).toContain('daily-loss-limit');
  });

  it('returns audit log entries', async () => {
    const res = await app.request('/api/governance/audit-log', { headers: AUTH_HEADER });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
