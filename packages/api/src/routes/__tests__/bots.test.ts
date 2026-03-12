import app from '../../server';

const AUTH_HEADER = { Authorization: 'Bearer scaffold.dGVzdC10ZW5hbnQ=' }; // base64("test-tenant")

const BASE_BOT = {
  name: 'My Shopify Bot',
  family: 'store' as const,
  subtype: 'shopify' as const,
  strategies: ['dynamic-pricing', 'ad-campaign'],
  riskProfile: {
    riskLevel: 'moderate',
    autonomyLevel: 'semi-autonomous',
    maxActionUsd: 100,
    dailyLossLimitUsd: 250,
    budgetUsd: 1000,
    requireApprovalAboveUsd: 500,
  },
};

describe('bots route', () => {
  it('requires auth to list bots', async () => {
    const res = await app.request('/api/bots');
    expect(res.status).toBe(401);
  });

  it('returns empty list when no bots created', async () => {
    const res = await app.request('/api/bots', { headers: AUTH_HEADER });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('creates a store bot', async () => {
    const res = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify(BASE_BOT),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.family).toBe('store');
    expect(body.data.subtype).toBe('shopify');
    expect(body.data.enabled).toBe(false);
    expect(body.data.strategies).toContain('dynamic-pricing');
    expect(body.data.riskProfile.riskLevel).toBe('moderate');
  });

  it('creates an elite crypto trading bot', async () => {
    const res = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Elite Crypto Bot',
        family: 'trading',
        subtype: 'crypto',
        strategies: ['momentum', 'dca'],
        riskProfile: {
          riskLevel: 'aggressive',
          autonomyLevel: 'semi-autonomous',
          maxActionUsd: 5000,
          dailyLossLimitUsd: 1000,
          budgetUsd: 10000,
          requireApprovalAboveUsd: 8000,
        },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.subtype).toBe('crypto');
    expect(body.data.family).toBe('trading');
  });

  it('creates an elite stocks trading bot', async () => {
    const res = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Elite Stocks Bot',
        family: 'trading',
        subtype: 'stocks',
        strategies: ['breakout', 'mean-reversion'],
        riskProfile: {
          riskLevel: 'moderate',
          autonomyLevel: 'fully-autonomous',
          maxActionUsd: 2000,
          dailyLossLimitUsd: 500,
          budgetUsd: 5000,
          requireApprovalAboveUsd: 0,
        },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.subtype).toBe('stocks');
  });

  it('creates an elite predictions bot', async () => {
    const res = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Elite Predictions Bot',
        family: 'trading',
        subtype: 'predictions',
        strategies: ['momentum'],
        riskProfile: {
          riskLevel: 'conservative',
          autonomyLevel: 'supervised',
          maxActionUsd: 100,
          dailyLossLimitUsd: 200,
          budgetUsd: 1000,
          requireApprovalAboveUsd: 50,
        },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.subtype).toBe('predictions');
  });

  it('creates a social media bot (TikTok)', async () => {
    const res = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'TikTok Growth Bot',
        family: 'social',
        subtype: 'tiktok',
        strategies: ['content-schedule', 'engagement-boost'],
        riskProfile: {
          riskLevel: 'moderate',
          autonomyLevel: 'semi-autonomous',
          maxActionUsd: 200,
          dailyLossLimitUsd: 100,
          budgetUsd: 500,
          requireApprovalAboveUsd: 150,
        },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.subtype).toBe('tiktok');
    expect(body.data.family).toBe('social');
  });

  it('rejects subtype that does not match family', async () => {
    const res = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...BASE_BOT,
        family: 'trading',
        subtype: 'shopify', // shopify is a store subtype, not trading
      }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('returns 422 for missing required fields', async () => {
    const res = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'incomplete' }),
    });
    expect(res.status).toBe(422);
  });

  it('starts a bot', async () => {
    // Create first
    const created = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify(BASE_BOT),
    });
    const { data: bot } = await created.json();
    expect(bot.enabled).toBe(false);

    // Start it
    const started = await app.request(`/api/bots/${bot.id}/start`, {
      method: 'POST',
      headers: AUTH_HEADER,
    });
    expect(started.status).toBe(200);
    const body = await started.json();
    expect(body.data.enabled).toBe(true);
  });

  it('stops a running bot', async () => {
    // Create and start
    const created = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify(BASE_BOT),
    });
    const { data: bot } = await created.json();
    await app.request(`/api/bots/${bot.id}/start`, { method: 'POST', headers: AUTH_HEADER });

    // Stop it
    const stopped = await app.request(`/api/bots/${bot.id}/stop`, {
      method: 'POST',
      headers: AUTH_HEADER,
    });
    expect(stopped.status).toBe(200);
    const body = await stopped.json();
    expect(body.data.enabled).toBe(false);
  });

  it('updates risk profile — user is always the boss', async () => {
    const created = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify(BASE_BOT),
    });
    const { data: bot } = await created.json();

    const updated = await app.request(`/api/bots/${bot.id}/config`, {
      method: 'PATCH',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        riskProfile: { riskLevel: 'conservative', maxActionUsd: 50 },
      }),
    });
    expect(updated.status).toBe(200);
    const body = await updated.json();
    expect(body.data.riskProfile.riskLevel).toBe('conservative');
    expect(body.data.riskProfile.maxActionUsd).toBe(50);
    // Other fields preserved
    expect(body.data.riskProfile.budgetUsd).toBe(1000);
  });

  it('updates strategies', async () => {
    const created = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify(BASE_BOT),
    });
    const { data: bot } = await created.json();

    const updated = await app.request(`/api/bots/${bot.id}/config`, {
      method: 'PATCH',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategies: ['product-promotion', 'review-response'] }),
    });
    expect(updated.status).toBe(200);
    const body = await updated.json();
    expect(body.data.strategies).toEqual(['product-promotion', 'review-response']);
  });

  it('returns 404 for unknown bot id', async () => {
    const res = await app.request('/api/bots/does-not-exist/start', {
      method: 'POST',
      headers: AUTH_HEADER,
    });
    expect(res.status).toBe(404);
  });

  it('gets a specific bot by id', async () => {
    const created = await app.request('/api/bots', {
      method: 'POST',
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify(BASE_BOT),
    });
    const { data: bot } = await created.json();

    const res = await app.request(`/api/bots/${bot.id}`, { headers: AUTH_HEADER });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(bot.id);
  });
});
