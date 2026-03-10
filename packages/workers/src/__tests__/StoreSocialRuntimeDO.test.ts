import { StoreSocialRuntimeDO } from '../index';

describe('StoreSocialRuntimeDO — store (Shopify)', () => {
  it('ticks but does not act before the loop interval elapses', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'ss1',
      tenantId: 't1',
      family: 'store',
      platform: 'shopify',
      strategies: ['dynamic-pricing', 'ad-campaign'],
      loopSeconds: 600,
    });
    const result = do_.tick();
    expect(result.ok).toBe(true);
    // First tick — lastCycleAt is 0, so elapsed > loopSeconds: should act immediately
    expect(result.acted).toBe(true);
  });

  it('skips act on consecutive ticks within interval', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'ss2',
      tenantId: 't2',
      family: 'store',
      platform: 'amazon',
      loopSeconds: 600,
    });
    do_.tick(); // first tick — acts
    const second = do_.tick(); // immediately after — should skip
    expect(second.ok).toBe(true);
    expect(second.acted).toBe(false);
  });

  it('returns correct loopSeconds in status', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'ss3',
      tenantId: 't3',
      family: 'store',
      platform: 'etsy',
      loopSeconds: 300,
    });
    do_.tick();
    const s = do_.status();
    expect(s.loopSeconds).toBe(300);
    expect(s.family).toBe('store');
    expect(s.subtype).toBe('etsy');
  });

  it('defaults store loop to 600 s when not specified', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'ss4',
      tenantId: 't4',
      family: 'store',
      platform: 'woocommerce',
    });
    expect(do_.status().loopSeconds).toBe(600);
  });

  it('trips circuit breaker when daily loss limit is breached', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'ss5',
      tenantId: 't5',
      family: 'store',
      platform: 'ebay',
      riskProfile: {
        riskLevel: 'moderate',
        autonomyLevel: 'semi-autonomous',
        maxActionUsd: 50,
        dailyLossLimitUsd: 100,
        budgetUsd: 500,
        requireApprovalAboveUsd: 200,
      },
    });
    do_.recordLoss(80);
    expect(do_.status().circuitOpen).toBe(false);
    do_.recordLoss(30); // total 110 > 100
    expect(do_.status().circuitOpen).toBe(true);
  });

  it('circuit breaker prevents acting', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'ss6',
      tenantId: 't6',
      family: 'store',
      platform: 'square',
    });
    do_.tripCircuitBreaker('manual');
    const result = do_.tick();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Circuit breaker open');
  });

  it('resets circuit breaker manually', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'ss7',
      tenantId: 't7',
      family: 'store',
      platform: 'shopify',
    });
    do_.tripCircuitBreaker();
    do_.resetCircuitBreaker();
    const result = do_.tick();
    expect(result.ok).toBe(true);
  });

  it('halts when budget is exhausted', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'ss8',
      tenantId: 't8',
      family: 'store',
      platform: 'amazon',
      riskProfile: {
        riskLevel: 'conservative',
        autonomyLevel: 'supervised',
        maxActionUsd: 10,
        dailyLossLimitUsd: 50,
        budgetUsd: 30,
        requireApprovalAboveUsd: 20,
      },
    });
    do_.recordLoss(30); // exhaust budget
    do_.resetCircuitBreaker();
    const result = do_.tick();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Budget exhausted');
  });

  it('throws for negative loss amount', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'ss9',
      tenantId: 't9',
      family: 'store',
      platform: 'etsy',
    });
    expect(() => do_.recordLoss(-5)).toThrow('cannot be negative');
  });
});

describe('StoreSocialRuntimeDO — social (TikTok)', () => {
  it('defaults social loop to 900 s when not specified', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'sl1',
      tenantId: 't10',
      family: 'social',
      platform: 'tiktok',
    });
    expect(do_.status().loopSeconds).toBe(900);
  });

  it('exposes strategies in status', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'sl2',
      tenantId: 't11',
      family: 'social',
      platform: 'instagram',
      strategies: ['content-schedule', 'ad-promotion'],
    });
    do_.tick();
    const s = do_.status();
    expect(s.strategies).toEqual(['content-schedule', 'ad-promotion']);
    expect(s.subtype).toBe('instagram');
  });

  it('runs on configured custom loop interval', () => {
    const do_ = new StoreSocialRuntimeDO({
      botId: 'sl3',
      tenantId: 't12',
      family: 'social',
      platform: 'linkedin',
      loopSeconds: 1800, // 30 minutes
    });
    do_.tick();
    expect(do_.status().loopSeconds).toBe(1800);
  });
});
