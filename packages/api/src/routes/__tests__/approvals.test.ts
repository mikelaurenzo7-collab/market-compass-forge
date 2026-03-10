import app from '../../server';

const AUTH_HEADER = { Authorization: 'Bearer scaffold-token' };

describe('approvals route', () => {
  it('requires auth to list approvals', async () => {
    const res = await app.request('/api/approvals');
    expect(res.status).toBe(401);
  });

  it('returns empty list when no approvals exist', async () => {
    const res = await app.request('/api/approvals', {
      headers: AUTH_HEADER,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('creates an approval item', async () => {
    const res = await app.request('/api/approvals', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botId: 'bot-1',
        action: 'TRADE_LARGE',
        payload: { amount: 9000, symbol: 'BTC-USD' },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('pending');
    expect(typeof body.data.id).toBe('string');
  });

  it('approves a pending item', async () => {
    // Create first
    const createRes = await app.request('/api/approvals', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: 'bot-2', action: 'SELL', payload: { symbol: 'ETH-USD' } }),
    });
    const { data: created } = await createRes.json();

    // Then approve
    const patchRes = await app.request(`/api/approvals/${created.id}`, {
      method: 'PATCH',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    expect(patchRes.status).toBe(200);
    const body = await patchRes.json();
    expect(body.data.status).toBe('approved');
    expect(body.data.resolvedAt).toBeTruthy();
  });

  it('returns 404 for unknown approval id', async () => {
    const res = await app.request('/api/approvals/does-not-exist', {
      method: 'PATCH',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 422 for invalid status value', async () => {
    // Create first
    const createRes = await app.request('/api/approvals', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: 'bot-3', action: 'BUY', payload: {} }),
    });
    const { data: created } = await createRes.json();

    const patchRes = await app.request(`/api/approvals/${created.id}`, {
      method: 'PATCH',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid-status' }),
    });
    expect(patchRes.status).toBe(422);
  });
});
