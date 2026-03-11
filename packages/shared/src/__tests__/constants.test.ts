import { DEFAULT_PRICING, INTEGRATIONS } from '../index';

describe('shared constants', () => {
  it('contains core v1 integrations', () => {
    expect(INTEGRATIONS.map((i) => i.id)).toEqual(
      expect.arrayContaining(['coinbase', 'binance', 'kalshi', 'shopify', 'x'])
    );
  });

  it('contains trading pro pricing', () => {
    expect(DEFAULT_PRICING.find((p) => p.family === 'trading' && p.tier === 'pro')?.monthlyUsd).toBe(1249);
  });

  it('contains enterprise tiers for each family', () => {
    ['trading','store','social','workforce'].forEach(f => {
      const plan = DEFAULT_PRICING.find((p) => p.family === f && p.tier === 'enterprise');
      expect(plan).toBeDefined();
      expect(plan?.monthlyUsd).toBeGreaterThan(0);
    });
  });
});
