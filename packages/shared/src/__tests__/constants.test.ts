import { DEFAULT_PRICING, INTEGRATIONS, ERROR_CODES } from '../index';

describe('shared constants', () => {
  it('contains core v1 integrations', () => {
    expect(INTEGRATIONS.map((i) => i.id)).toEqual(
      expect.arrayContaining(['coinbase', 'binance', 'kalshi', 'shopify', 'x'])
    );
  });

  it('contains trading pro pricing', () => {
    expect(DEFAULT_PRICING.find((p) => p.family === 'trading' && p.tier === 'pro')?.monthlyUsd).toBe(1249);
  });

  it('contains enterprise pricing for all bot families', () => {
    const families = ['trading', 'store', 'social', 'workforce'] as const;
    for (const family of families) {
      const plan = DEFAULT_PRICING.find((p) => p.family === family && p.tier === 'enterprise');
      expect(plan, `${family} enterprise plan missing`).toBeDefined();
      expect(plan!.monthlyUsd).toBeGreaterThan(0);
    }
  });

  it('has correct number of pricing plans (4 families × 3 tiers)', () => {
    expect(DEFAULT_PRICING).toHaveLength(12);
  });

  it('exports all expected error codes', () => {
    expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ERROR_CODES.BUDGET_EXCEEDED).toBe('BUDGET_EXCEEDED');
    expect(ERROR_CODES.CIRCUIT_OPEN).toBe('CIRCUIT_OPEN');
  });

  it('all integrations have required fields', () => {
    for (const integration of INTEGRATIONS) {
      expect(integration.id).toBeTruthy();
      expect(integration.displayName).toBeTruthy();
      expect(['trading', 'ecommerce', 'social']).toContain(integration.category);
      expect(['planned', 'beta', 'ga']).toContain(integration.status);
    }
  });
});
