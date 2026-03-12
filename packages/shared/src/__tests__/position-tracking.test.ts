import { describe, it, expect, vi } from 'vitest';
import type { SafetyContext, TradingBotConfig } from '../index';
import {
  createDefaultBudget,
  createDefaultCircuitBreaker,
  createDefaultPolicies,
} from '../index';
import {
  createTradingEngineState,
  executeTradingTick,
  closeTrackedPosition,
  createPriceHistory,
  type TradingEngineState,
  type OpenPosition,
} from '../trading/engine';

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
    strategy: 'dca',
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
    change24hPercent: 0,
    bid: price,
    ask: price + 1,
    timestamp: Date.now(),
  };
}

function makeStubAdapter(
  opts: {
    prices?: Record<string, number>;
    positions?: any[];
    balance?: number;
    fillOrders?: boolean;
  } = {},
) {
  const prices = opts.prices ?? { 'BTC-USD': 100 };
  const balance = opts.balance ?? 10000;
  const fillOrders = opts.fillOrders ?? true;
  const orders: any[] = [];

  return {
    platform: 'coinbase' as const,
    fetchMarketData: async (symbol: string) => makeMarketData(symbol, prices[symbol] ?? 100),
    placeOrder: async (signal: any) => {
      orders.push(signal);
      return { orderId: `order-${orders.length}`, filled: fillOrders };
    },
    getPositions: async () => opts.positions ?? [],
    getBalance: async () => ({ availableUsd: balance, totalUsd: balance }),
    orders,
  };
}

// ─── closeTrackedPosition unit tests ──────────────────────────

describe('closeTrackedPosition', () => {
  function makeState(openPositions: OpenPosition[]): TradingEngineState {
    const state = createTradingEngineState(makeConfig(), makeSafety());
    state.openPositions = new Map([['BTC-USD', openPositions]]);
    return state;
  }

  it('closes full position with profit', () => {
    const state = makeState([
      { symbol: 'BTC-USD', side: 'buy', entryPrice: 100, quantity: 1, entryTimestamp: 1000, orderId: 'o1' },
    ]);

    const pnl = closeTrackedPosition(state, 'BTC-USD', 110, 1);

    expect(pnl).toBe(10); // (110-100)*1 = 10
    expect(state.totalPnl).toBe(10);
    expect(state.totalTrades).toBe(1);
    expect(state.winningTrades).toBe(1);
    expect(state.consecutiveLosses).toBe(0);
    expect(state.openPositions.has('BTC-USD')).toBe(false);
  });

  it('closes full position with loss', () => {
    const state = makeState([
      { symbol: 'BTC-USD', side: 'buy', entryPrice: 100, quantity: 2, entryTimestamp: 1000, orderId: 'o1' },
    ]);

    const pnl = closeTrackedPosition(state, 'BTC-USD', 90, 2);

    expect(pnl).toBe(-20); // (90-100)*2 = -20
    expect(state.totalPnl).toBe(-20);
    expect(state.totalTrades).toBe(1);
    expect(state.winningTrades).toBe(0);
    expect(state.consecutiveLosses).toBe(1);
  });

  it('partially closes position (FIFO)', () => {
    const state = makeState([
      { symbol: 'BTC-USD', side: 'buy', entryPrice: 100, quantity: 3, entryTimestamp: 1000, orderId: 'o1' },
      { symbol: 'BTC-USD', side: 'buy', entryPrice: 110, quantity: 2, entryTimestamp: 2000, orderId: 'o2' },
    ]);

    // close 2 units — should come from first position (FIFO)
    const pnl = closeTrackedPosition(state, 'BTC-USD', 120, 2);

    expect(pnl).toBe(40); // (120-100)*2 = 40
    expect(state.totalTrades).toBe(1);
    // remaining: 1 unit @100 (leftover from o1) + 2 units @110 (o2)
    const remaining = state.openPositions.get('BTC-USD')!;
    expect(remaining).toHaveLength(2);
    expect(remaining[0].quantity).toBe(1);
    expect(remaining[0].entryPrice).toBe(100);
    expect(remaining[1].quantity).toBe(2);
    expect(remaining[1].entryPrice).toBe(110);
  });

  it('closes across multiple FIFO positions', () => {
    const state = makeState([
      { symbol: 'BTC-USD', side: 'buy', entryPrice: 100, quantity: 1, entryTimestamp: 1000, orderId: 'o1' },
      { symbol: 'BTC-USD', side: 'buy', entryPrice: 110, quantity: 1, entryTimestamp: 2000, orderId: 'o2' },
    ]);

    // close all 2 units at price 105
    const pnl = closeTrackedPosition(state, 'BTC-USD', 105, 2);

    // (105-100)*1 + (105-110)*1 = 5 + (-5) = 0
    expect(pnl).toBe(0);
    expect(state.totalPnl).toBe(0);
    expect(state.totalTrades).toBe(1);
    expect(state.winningTrades).toBe(1); // 0 >= 0
    expect(state.openPositions.has('BTC-USD')).toBe(false);
  });

  it('handles sell-side position P&L correctly', () => {
    const state = createTradingEngineState(makeConfig(), makeSafety());
    state.openPositions = new Map([
      ['BTC-USD', [
        { symbol: 'BTC-USD', side: 'sell', entryPrice: 100, quantity: 1, entryTimestamp: 1000, orderId: 'o1' },
      ]],
    ]);

    // short: profit when price drops
    const pnl = closeTrackedPosition(state, 'BTC-USD', 90, 1);
    expect(pnl).toBe(10); // (90-100)*1*(-1) = 10
    expect(state.winningTrades).toBe(1);
  });

  it('triggers cooldown after 3 consecutive losses', () => {
    const state = createTradingEngineState(
      makeConfig({ cooldownAfterLossMs: 60000 }),
      makeSafety(),
    );
    state.openPositions = new Map([
      ['BTC-USD', [
        { symbol: 'BTC-USD', side: 'buy', entryPrice: 100, quantity: 1, entryTimestamp: 1000, orderId: 'o1' },
        { symbol: 'BTC-USD', side: 'buy', entryPrice: 100, quantity: 1, entryTimestamp: 2000, orderId: 'o2' },
        { symbol: 'BTC-USD', side: 'buy', entryPrice: 100, quantity: 1, entryTimestamp: 3000, orderId: 'o3' },
      ]],
    ]);

    // 3 losing trades
    closeTrackedPosition(state, 'BTC-USD', 90, 1);
    expect(state.consecutiveLosses).toBe(1);
    expect(state.cooldownUntil).toBe(0);

    closeTrackedPosition(state, 'BTC-USD', 90, 1);
    expect(state.consecutiveLosses).toBe(2);
    expect(state.cooldownUntil).toBe(0);

    closeTrackedPosition(state, 'BTC-USD', 90, 1);
    expect(state.consecutiveLosses).toBe(3);
    expect(state.cooldownUntil).toBeGreaterThan(Date.now());
  });

  it('returns 0 when no tracked positions exist', () => {
    const state = createTradingEngineState(makeConfig(), makeSafety());
    const pnl = closeTrackedPosition(state, 'BTC-USD', 110, 1);

    expect(pnl).toBe(0);
    expect(state.totalTrades).toBe(1);
    expect(state.winningTrades).toBe(1); // 0 >= 0
  });
});

// ─── Integration tests: position tracking through executeTradingTick ──────────

/** Pre-fill price history with 25 entries so the engine doesn't skip the symbol
 *  (requires >= 20 data points before processing signals/exits). */
function prefillHistory(state: TradingEngineState, symbol: string, basePrice: number) {
  const h = createPriceHistory();
  for (let i = 0; i < 25; i++) {
    h.prices.push(basePrice);
    h.volumes.push(1000);
    h.highs.push(basePrice * 1.01);
    h.lows.push(basePrice * 0.99);
  }
  state.priceHistories.set(symbol, h);
}

describe('position tracking integration', () => {
  it('records position in openPositions on buy fill', async () => {
    const config = makeConfig({ strategy: 'dca' });
    const state = createTradingEngineState(config, makeSafety());
    prefillHistory(state, 'BTC-USD', 100);
    const adapter = makeStubAdapter({ prices: { 'BTC-USD': 100 } });

    const { newState } = await executeTradingTick(state, adapter as any);

    const positions = newState.openPositions.get('BTC-USD');
    expect(positions).toBeDefined();
    expect(positions!.length).toBeGreaterThan(0);
    expect(positions![0].entryPrice).toBe(100);
    expect(positions![0].side).toBe('buy');
    expect(newState.lastDcaBuy.get('BTC-USD')).toBeTypeOf('number');
  });

  it('stop-loss triggers closeTrackedPosition and updates trade stats', async () => {
    const config = makeConfig({ stopLossPercent: 0.05 });
    const state = createTradingEngineState(config, makeSafety());
    prefillHistory(state, 'BTC-USD', 100);
    // Simulate an existing tracked position
    state.openPositions = new Map([
      ['BTC-USD', [
        { symbol: 'BTC-USD', side: 'buy', entryPrice: 100, quantity: 1, entryTimestamp: 1000, orderId: 'o-existing' },
      ]],
    ]);

    // Price dropped >5% — should trigger stop-loss
    const adapter = makeStubAdapter({
      prices: { 'BTC-USD': 94 },  // -6%
      positions: [],
    });

    const { newState } = await executeTradingTick(state, adapter as any);

    // Stop-loss should close at least one tracked position and book the loss.
    // In paper mode the strategy may also open a fresh simulated position later in the same tick,
    // so we assert on trade outcomes rather than requiring the book to be empty.
    const remaining = newState.openPositions.get('BTC-USD');
    expect((remaining?.length ?? 0)).toBeLessThanOrEqual(1);
    // Should have counted the trade
    expect(newState.totalTrades).toBeGreaterThanOrEqual(1);
    // P&L should be negative
    expect(newState.totalPnl).toBeLessThan(0);
  });

  it('take-profit triggers closeTrackedPosition and updates trade stats', async () => {
    const config = makeConfig({ takeProfitPercent: 0.10 });
    const state = createTradingEngineState(config, makeSafety());
    prefillHistory(state, 'BTC-USD', 100);
    state.openPositions = new Map([
      ['BTC-USD', [
        { symbol: 'BTC-USD', side: 'buy', entryPrice: 100, quantity: 1, entryTimestamp: 1000, orderId: 'o-existing' },
      ]],
    ]);

    // Price rose >10% — should trigger take-profit
    const adapter = makeStubAdapter({
      prices: { 'BTC-USD': 112 },  // +12%
      positions: [],
    });

    const { newState } = await executeTradingTick(state, adapter as any);

    // Take-profit should have closed the position (totalTrades incremented)
    // Note: DCA may immediately re-open a new position, so we check trade stats
    expect(newState.totalTrades).toBeGreaterThanOrEqual(1);
    expect(newState.totalPnl).toBeGreaterThan(0);
    expect(newState.winningTrades).toBeGreaterThanOrEqual(1);
  });

  it('trailing stop triggers at correct level', async () => {
    const config = makeConfig({ trailingStopPercent: 0.03 });
    const state = createTradingEngineState(config, makeSafety());
    prefillHistory(state, 'BTC-USD', 110);
    state.openPositions = new Map([
      ['BTC-USD', [
        { symbol: 'BTC-USD', side: 'buy', entryPrice: 100, quantity: 1, entryTimestamp: 1000, orderId: 'o-existing' },
      ]],
    ]);
    // High water mark was 110, price dropped below 110*(1-0.03) = 106.7
    state.highWater.set('BTC-USD', 110);

    const adapter = makeStubAdapter({
      prices: { 'BTC-USD': 106 },  // below trailing stop @ 106.7
      positions: [],
    });

    const { newState } = await executeTradingTick(state, adapter as any);

    // Trailing stop should have closed the position (totalTrades incremented)
    // Note: DCA may immediately re-open, so we check trade stats instead of empty positions
    expect(newState.totalTrades).toBeGreaterThanOrEqual(1);
    // Profit: 106 - 100 = 6
    expect(newState.totalPnl).toBeGreaterThan(0);
  });

  it('daily loss limit halts trading', async () => {
    const config = makeConfig({ maxDailyLossUsd: 50 });
    const state = createTradingEngineState(config, makeSafety());
    // Simulate large daily loss already occurred
    state.totalPnl = -60;

    const adapter = makeStubAdapter();

    const { result } = await executeTradingTick(state, adapter as any);

    expect(result.result).toBe('skipped');
    expect(result.details?.reason).toBe('daily_loss_limit_reached');
    expect(adapter.orders).toHaveLength(0);
  });

  it('consecutive loss cooldown blocks trading', async () => {
    const config = makeConfig({ cooldownAfterLossMs: 60000 });
    const state = createTradingEngineState(config, makeSafety());
    // Cooldown is active — 30 seconds from now
    state.cooldownUntil = Date.now() + 30000;

    const adapter = makeStubAdapter();

    const { result } = await executeTradingTick(state, adapter as any);

    expect(result.result).toBe('skipped');
    expect(result.details?.reason).toBe('consecutive_loss_cooldown');
    expect(adapter.orders).toHaveLength(0);
  });

  it('cooldown resets after expiry', async () => {
    const config = makeConfig({ cooldownAfterLossMs: 60000 });
    const state = createTradingEngineState(config, makeSafety());
    // Cooldown expired 5 seconds ago
    state.cooldownUntil = Date.now() - 5000;

    const adapter = makeStubAdapter();

    const { result, newState } = await executeTradingTick(state, adapter as any);

    // Should NOT be skipped for cooldown
    if (result.result === 'skipped') {
      expect(result.details?.reason).not.toBe('consecutive_loss_cooldown');
    }
    expect(newState.cooldownUntil).toBe(0);
  });

  it('unfilled order does not record position', async () => {
    const config = makeConfig();
    const state = createTradingEngineState(config, makeSafety());
    const adapter = makeStubAdapter({ fillOrders: false });

    const { newState } = await executeTradingTick(state, adapter as any);

    // No positions should be tracked since nothing fills
    const positions = newState.openPositions.get('BTC-USD');
    expect(!positions || positions.length === 0).toBe(true);
  });
});
