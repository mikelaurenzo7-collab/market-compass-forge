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
