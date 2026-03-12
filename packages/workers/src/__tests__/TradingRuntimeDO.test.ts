import { TradingRuntimeDO, bootstrapWorkers } from '../index';

describe('TradingRuntimeDO', () => {
  it('ticks successfully on first call', () => {
    const do_ = new TradingRuntimeDO({ botId: 'b1', tenantId: 't1', family: 'trading' });
    const result = do_.tick();
    expect(result.ok).toBe(true);
    expect(result.loopSeconds).toBe(1);
  });

  it('returns status snapshot', () => {
    const do_ = new TradingRuntimeDO({ botId: 'b2', tenantId: 't2', family: 'store' });
    do_.tick();
    const s = do_.status();
    expect(s.botId).toBe('b2');
    expect(s.tenantId).toBe('t2');
    expect(s.family).toBe('store');
    expect(s.running).toBe(true);
    expect(s.circuitOpen).toBe(false);
    expect(s.budgetRemainingUsd).toBeGreaterThan(0);
  });

  it('trips circuit breaker manually', () => {
    const do_ = new TradingRuntimeDO({ botId: 'b3', tenantId: 't3', family: 'trading' });
    do_.tripCircuitBreaker('manual test');
    const result = do_.tick();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Circuit breaker open');
  });

  it('trips circuit breaker after daily loss limit exceeded', () => {
    const do_ = new TradingRuntimeDO({
      botId: 'b4',
      tenantId: 't4',
      family: 'trading',
      dailyLossLimitUsd: 100,
    });
    do_.recordLoss(50);
    expect(do_.status().circuitOpen).toBe(false);
    do_.recordLoss(60); // total 110 > 100
    expect(do_.status().circuitOpen).toBe(true);
  });

  it('resets circuit breaker manually', () => {
    const do_ = new TradingRuntimeDO({ botId: 'b5', tenantId: 't5', family: 'trading' });
    do_.tripCircuitBreaker();
    do_.resetCircuitBreaker();
    const result = do_.tick();
    expect(result.ok).toBe(true);
  });

  it('halts when budget is exhausted', () => {
    const do_ = new TradingRuntimeDO({
      botId: 'b6',
      tenantId: 't6',
      family: 'trading',
      budgetUsd: 50,
    });
    do_.recordLoss(50);
    // manually reset circuit so we can observe budget check
    do_.resetCircuitBreaker();
    const result = do_.tick();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Budget exhausted');
  });

  it('throws for negative loss amount', () => {
    const do_ = new TradingRuntimeDO({ botId: 'b7', tenantId: 't7', family: 'trading' });
    expect(() => do_.recordLoss(-10)).toThrow('cannot be negative');
  });
});

describe('bootstrapWorkers', () => {
  it('starts and returns ok tick', () => {
    const result = bootstrapWorkers({ botId: 'w1', tenantId: 'tenant', family: 'trading' });
    expect(result.ok).toBe(true);
  });
});

describe('TradingRuntimeDO — elite subtypes and risk profile', () => {
  it('exposes tradingBotType (crypto) in status', () => {
    const do_ = new TradingRuntimeDO({
      botId: 'e1',
      tenantId: 'te1',
      family: 'trading',
      tradingBotType: 'crypto',
      strategies: ['dca', 'momentum'],
    });
    do_.tick();
    const s = do_.status();
    expect(s.subtype).toBe('crypto');
    expect(s.strategies).toEqual(['dca', 'momentum']);
  });

  it('exposes tradingBotType (stocks) in status', () => {
    const do_ = new TradingRuntimeDO({
      botId: 'e2',
      tenantId: 'te2',
      family: 'trading',
      tradingBotType: 'stocks',
      strategies: ['breakout'],
    });
    do_.tick();
    expect(do_.status().subtype).toBe('stocks');
  });

  it('exposes tradingBotType (predictions) in status', () => {
    const do_ = new TradingRuntimeDO({
      botId: 'e3',
      tenantId: 'te3',
      family: 'trading',
      tradingBotType: 'predictions',
      strategies: ['arbitrage'],
    });
    do_.tick();
    expect(do_.status().subtype).toBe('predictions');
  });

  it('accepts UserRiskProfile and uses its budget/loss limit', () => {
    const do_ = new TradingRuntimeDO({
      botId: 'e4',
      tenantId: 'te4',
      family: 'trading',
      tradingBotType: 'crypto',
      riskProfile: {
        riskLevel: 'moderate',
        autonomyLevel: 'semi-autonomous',
        maxActionUsd: 500,
        dailyLossLimitUsd: 300,
        budgetUsd: 2000,
        requireApprovalAboveUsd: 1000,
      },
    });
    expect(do_.status().budgetRemainingUsd).toBe(2000);
    do_.recordLoss(299);
    expect(do_.status().circuitOpen).toBe(false);
    do_.recordLoss(2); // total 301 > 300
    expect(do_.status().circuitOpen).toBe(true);
  });

  it('riskProfile budget takes precedence over legacy budgetUsd', () => {
    const do_ = new TradingRuntimeDO({
      botId: 'e5',
      tenantId: 'te5',
      family: 'trading',
      budgetUsd: 100, // legacy — should be ignored
      riskProfile: {
        riskLevel: 'conservative',
        autonomyLevel: 'supervised',
        maxActionUsd: 50,
        dailyLossLimitUsd: 200,
        budgetUsd: 5000,
        requireApprovalAboveUsd: 100,
      },
    });
    expect(do_.status().budgetRemainingUsd).toBe(5000);
  });
});
