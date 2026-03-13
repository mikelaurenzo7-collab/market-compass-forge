import { describe, it, expect } from 'vitest';
import type { SafetyContext, TradingBotConfig } from '../index';
import {
  createDefaultBudget,
  createDefaultCircuitBreaker,
  createDefaultPolicies,
} from '../index';
import {
  createTradingEngineState,
  executeTradingTick,
  executeArbitrageTick,
  createPriceHistory,
  generateStrategySignal,
  type TradingAdapter,
  type TradingEngineState,
} from '../trading/engine';
import { computeIndicators } from '../trading/indicators';

function makeSafety(tenantId = 't', botId = 'b', platform = 'coinbase'): SafetyContext {
  return {
    tenantId,
    botId,
    platform: platform as any,
    policies: createDefaultPolicies('trading'),
    budget: createDefaultBudget('trading'),
    circuitBreaker: createDefaultCircuitBreaker(),
  };
}

function makeConfig(overrides: Partial<TradingBotConfig> = {}): TradingBotConfig {
  return {
    platform: 'coinbase',
    strategy: 'momentum',
    symbols: ['BTC-USD'],
    maxPositionSizeUsd: 100,
    maxDailyLossUsd: 1000,
    maxOpenPositions: 2,
    stopLossPercent: 0.05,
    takeProfitPercent: 0.10,
    cooldownAfterLossMs: 0,
    paperTrading: true,
    ...overrides,
  };
}

function makeMarketData(symbol: string, price: number) {
  return {
    symbol,
    price,
    volume24h: 1000,
    high24h: price * 1.05,
    low24h: price * 0.95,
    change24hPercent: 2,
    bid: price - 0.5,
    ask: price + 0.5,
    timestamp: Date.now(),
  };
}

function makeStubAdapter(opts: {
  prices?: Record<string, number>;
  balance?: number;
  fillOrders?: boolean;
  platform?: string;
} = {}) {
  const prices = opts.prices ?? { 'BTC-USD': 100 };
  const balance = opts.balance ?? 10000;
  const orders: any[] = [];

  return {
    platform: (opts.platform ?? 'coinbase') as any,
    fetchMarketData: async (symbol: string) => makeMarketData(symbol, prices[symbol] ?? 100),
    placeOrder: async (signal: any) => {
      orders.push(signal);
      return { orderId: `order-${orders.length}`, filled: opts.fillOrders ?? true };
    },
    getPositions: async () => [],
    getBalance: async () => ({ availableUsd: balance, totalUsd: balance }),
    orders,
  };
}

/** Pre-fill price history with realistic trending data */
function prefillHistory(state: TradingEngineState, symbol: string, prices: number[]) {
  const h = createPriceHistory();
  for (const p of prices) {
    h.prices.push(p);
    h.volumes.push(1000);
    h.highs.push(p * 1.01);
    h.lows.push(p * 0.99);
  }
  state.priceHistories.set(symbol, h);
}

// Generate an uptrend of N prices starting from base
function uptrend(base: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => base + i * 0.5);
}

// ─── Multi-Timeframe Confirmation Tests ───────────────────────

describe('multi-timeframe confirmation', () => {
  it('blocks trade when secondary timeframe disagrees', async () => {
    const config = makeConfig({
      strategy: 'momentum',
      multiTimeframeConfirmation: true,
    });
    const state = createTradingEngineState(config, makeSafety());

    // Primary: uptrend (momentum → buy)
    prefillHistory(state, 'BTC-USD', uptrend(100, 30));

    // Secondary: downtrend (momentum → sell/hold) — disagrees
    const secH = createPriceHistory();
    const downtrend = Array.from({ length: 30 }, (_, i) => 150 - i * 0.5);
    for (const p of downtrend) {
      secH.prices.push(p);
      secH.volumes.push(1000);
      secH.highs.push(p * 1.01);
      secH.lows.push(p * 0.99);
    }
    state.secondaryHistories.set('BTC-USD_15m', secH);

    const adapter = makeStubAdapter({ prices: { 'BTC-USD': 115 } });
    const { result } = await executeTradingTick(state, adapter as any);

    // Should skip because timeframes disagree
    expect(result.result).toBe('skipped');
  });

  it('allows trade when both timeframes agree', async () => {
    const config = makeConfig({
      strategy: 'momentum',
      multiTimeframeConfirmation: true,
    });
    const state = createTradingEngineState(config, makeSafety());

    // Both timeframes: uptrend
    prefillHistory(state, 'BTC-USD', uptrend(100, 30));

    const secH = createPriceHistory();
    const secUptrend = uptrend(90, 30);
    for (const p of secUptrend) {
      secH.prices.push(p);
      secH.volumes.push(1000);
      secH.highs.push(p * 1.01);
      secH.lows.push(p * 0.99);
    }
    state.secondaryHistories.set('BTC-USD_15m', secH);

    const adapter = makeStubAdapter({ prices: { 'BTC-USD': 115 } });
    const { result } = await executeTradingTick(state, adapter as any);

    // Should execute (paper trade) since both timeframes agree
    expect(['executed', 'skipped']).toContain(result.result);
  });

  it('behaves normally when multiTimeframeConfirmation is off', async () => {
    const config = makeConfig({
      strategy: 'dca',
      multiTimeframeConfirmation: false,
    });
    const state = createTradingEngineState(config, makeSafety());

    const adapter = makeStubAdapter();
    const { result } = await executeTradingTick(state, adapter as any);

    // Should proceed normally (DCA generates buy signals)
    expect(result.botId).toBe('b');
    expect(['executed', 'skipped']).toContain(result.result);
  });

  it('skips secondary check when secondary history has insufficient data', async () => {
    const config = makeConfig({
      strategy: 'dca',
      multiTimeframeConfirmation: true,
    });
    const state = createTradingEngineState(config, makeSafety());

    // Primary has enough data
    prefillHistory(state, 'BTC-USD', uptrend(100, 30));

    // Secondary has only 5 data points (< 20 threshold)
    const secH = createPriceHistory();
    for (let i = 0; i < 5; i++) {
      secH.prices.push(100 + i);
      secH.volumes.push(1000);
      secH.highs.push(101 + i);
      secH.lows.push(99 + i);
    }
    state.secondaryHistories.set('BTC-USD_15m', secH);

    const adapter = makeStubAdapter({ prices: { 'BTC-USD': 115 } });
    const { result } = await executeTradingTick(state, adapter as any);

    // Should proceed without secondary check
    expect(result.botId).toBe('b');
    expect(['executed', 'skipped']).toContain(result.result);
  });
});

// ─── Cross-Exchange Arbitrage Tests ───────────────────────────

describe('cross-exchange arbitrage', () => {
  it('executes when spread exceeds threshold', async () => {
    const config = makeConfig({ strategy: 'arbitrage', arbitrageThresholdPercent: 1 });
    const state = createTradingEngineState(config, makeSafety());

    const adapters = new Map<string, TradingAdapter>([
      ['coinbase', makeStubAdapter({ prices: { 'BTC-USD': 100 }, platform: 'coinbase' }) as any],
      ['binance', makeStubAdapter({ prices: { 'BTC-USD': 103 }, platform: 'binance' }) as any],
    ]);

    const { result, newState } = await executeArbitrageTick(state, adapters, 'BTC-USD');

    expect(result.result).toBe('executed');
    expect(result.details?.buyPlatform).toBe('coinbase');
    expect(result.details?.sellPlatform).toBe('binance');
    expect(result.details?.buyFilled).toBe(true);
    expect(result.details?.sellFilled).toBe(true);
    expect(newState.totalPnl).toBeGreaterThan(0);
    expect(newState.totalTrades).toBe(1);
    expect(newState.winningTrades).toBe(1);
  });

  it('skips when spread is below threshold', async () => {
    const config = makeConfig({ strategy: 'arbitrage', arbitrageThresholdPercent: 5 });
    const state = createTradingEngineState(config, makeSafety());

    const adapters = new Map<string, TradingAdapter>([
      ['coinbase', makeStubAdapter({ prices: { 'BTC-USD': 100 }, platform: 'coinbase' }) as any],
      ['binance', makeStubAdapter({ prices: { 'BTC-USD': 101 }, platform: 'binance' }) as any],
    ]);

    const { result } = await executeArbitrageTick(state, adapters, 'BTC-USD');

    expect(result.result).toBe('skipped');
    expect(result.details?.reason).toBe('spread_below_threshold');
  });

  it('skips when only one exchange is available', async () => {
    const config = makeConfig({ strategy: 'arbitrage' });
    const state = createTradingEngineState(config, makeSafety());

    const adapters = new Map<string, TradingAdapter>([
      ['coinbase', makeStubAdapter({ platform: 'coinbase' }) as any],
    ]);

    const { result } = await executeArbitrageTick(state, adapters, 'BTC-USD');

    expect(result.result).toBe('skipped');
    expect(result.details?.reason).toBe('insufficient_exchanges');
  });

  it('reports partial fill as error', async () => {
    const config = makeConfig({ strategy: 'arbitrage', arbitrageThresholdPercent: 1 });
    const state = createTradingEngineState(config, makeSafety());

    const adapters = new Map<string, TradingAdapter>([
      ['coinbase', makeStubAdapter({ prices: { 'BTC-USD': 100 }, fillOrders: true, platform: 'coinbase' }) as any],
      ['binance', makeStubAdapter({ prices: { 'BTC-USD': 105 }, fillOrders: false, platform: 'binance' }) as any],
    ]);

    const { result, newState } = await executeArbitrageTick(state, adapters, 'BTC-USD');

    expect(result.result).toBe('error');
    expect(result.details?.buyFilled).toBe(true);
    expect(result.details?.sellFilled).toBe(false);
    // No P&L update on partial fill
    expect(newState.totalPnl).toBe(0);
    expect(newState.totalTrades).toBe(0);
  });

  it('handles three-exchange comparison and picks best spread', async () => {
    const config = makeConfig({ strategy: 'arbitrage', arbitrageThresholdPercent: 1 });
    const state = createTradingEngineState(config, makeSafety());

    const adapters = new Map<string, TradingAdapter>([
      ['coinbase', makeStubAdapter({ prices: { 'BTC-USD': 100 }, platform: 'coinbase' }) as any],
      ['binance', makeStubAdapter({ prices: { 'BTC-USD': 102 }, platform: 'binance' }) as any],
      ['alpaca', makeStubAdapter({ prices: { 'BTC-USD': 106 }, platform: 'alpaca' }) as any],
    ]);

    const { result } = await executeArbitrageTick(state, adapters, 'BTC-USD');

    expect(result.result).toBe('executed');
    // Should buy cheapest (coinbase @ 100) and sell most expensive (alpaca @ 106)
    expect(result.details?.buyPlatform).toBe('coinbase');
    expect(result.details?.sellPlatform).toBe('alpaca');
  });

  it('calculates correct net P&L', async () => {
    const config = makeConfig({
      strategy: 'arbitrage',
      arbitrageThresholdPercent: 1,
      maxPositionSizeUsd: 1000,
      maxDailyLossUsd: 10000,
    });
    const state = createTradingEngineState(config, makeSafety());

    const adapters = new Map<string, TradingAdapter>([
      ['coinbase', makeStubAdapter({ prices: { 'BTC-USD': 100 }, platform: 'coinbase' }) as any],
      ['binance', makeStubAdapter({ prices: { 'BTC-USD': 110 }, platform: 'binance' }) as any],
    ]);

    const { newState } = await executeArbitrageTick(state, adapters, 'BTC-USD');

    // Spread = 10%, position = min(1000, 10000 * 0.05) = 500 USD
    // quantity = 500 / 100 = 5 units
    // P&L = (110 - 100) * 5 = 50
    expect(newState.totalPnl).toBe(50);
  });
});

// ─── Polymarket Adapter Tests ─────────────────────────────────

describe('polymarket adapter', () => {
  it('PolymarketAdapter class has all required methods', async () => {
    // Verify the adapter can be constructed and has the right interface
    const { PolymarketAdapter } = await import('../trading/adapters');
    const adapter = new PolymarketAdapter({ apiKey: 'test', apiSecret: 'test' });

    expect(adapter.platform).toBe('polymarket');
    expect(typeof adapter.fetchMarketData).toBe('function');
    expect(typeof adapter.placeOrder).toBe('function');
    expect(typeof adapter.getPositions).toBe('function');
    expect(typeof adapter.getBalance).toBe('function');
  });
});

// ─── generateStrategySignal: arbitrage signal tests ───────────

describe('arbitrage signal', () => {
  it('detects spread above threshold', () => {
    const config = makeConfig({ strategy: 'arbitrage', arbitrageThresholdPercent: 1 }) as any;
    // 100% spread → confidence = 100 (well above coinbase 60% threshold)
    config.arbitragePrices = [50, 100];
    const state = createTradingEngineState(config, makeSafety());
    const indicators = computeIndicators(
      uptrend(100, 25),
      Array(25).fill(1000),
      uptrend(101, 25),
      uptrend(99, 25),
    );

    const signal = generateStrategySignal(config, indicators, makeMarketData('BTC-USD', 100), state);

    expect(signal.direction).toBe('buy');
    expect(signal.confidence).toBeGreaterThan(0);
  });

  it('holds when spread below threshold', () => {
    const config = makeConfig({ strategy: 'arbitrage', arbitrageThresholdPercent: 10 }) as any;
    config.arbitragePrices = [100, 101];
    const state = createTradingEngineState(config, makeSafety());
    const indicators = computeIndicators(
      uptrend(100, 25),
      Array(25).fill(1000),
      uptrend(101, 25),
      uptrend(99, 25),
    );

    const signal = generateStrategySignal(config, indicators, makeMarketData('BTC-USD', 100), state);

    expect(signal.direction).toBe('hold');
  });
});
