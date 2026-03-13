import { describe, it, expect } from 'vitest';
import { createRuntime, getRuntime, destroyRuntime } from '../index.js';
import type { TradingBotConfig } from '@beastbots/shared';

// stub adapter that will simply return no signals
const stubTradingAdapter = {
  fetchMarketData: async () => ({
    symbol: 'BTC-USD',
    price: 100,
    volume24h: 1000,
    high24h: 105,
    low24h: 95,
    change24hPercent: 0,
    bid: 100,
    ask: 101,
    timestamp: Date.now(),
  }),
  placeOrder: async () => ({ orderId: 'x', filled: true }),
  getPositions: async () => [],
  getBalance: async () => ({ availableUsd: 10000, totalUsd: 10000 }),
};

describe('runtime durable object', () => {
  it('creates, starts, ticks, and records metrics', async () => {
    const botId = 'r1';
    const tenant = 't1';
    const config: TradingBotConfig = {
      platform: 'coinbase',
      strategy: 'dca',
      symbols: ['BTC-USD'],
      maxPositionSizeUsd: 100,
      maxDailyLossUsd: 1000,
      maxOpenPositions: 1,
      stopLossPercent: 0.1,
      takeProfitPercent: 0.1,
      cooldownAfterLossMs: 0,
      paperTrading: true,
    };

    const runtime = createRuntime({ botId, tenantId: tenant, family: 'trading', platform: 'coinbase', config, adapter: stubTradingAdapter });
    expect(runtime.getStatus()).toBe('idle');

    const started = runtime.start();
    expect(started.ok).toBe(true);
    expect(runtime.getStatus()).toBe('running');

    // perform a couple ticks manually
    const tick1 = await runtime.tick();
    const tick2 = await runtime.tick();
    expect(tick1.botId).toBe(botId);
    expect(['executed','skipped']).toContain(tick1.result);

    const metrics = runtime.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics?.totalTicks).toBeGreaterThanOrEqual(2);

    // ensure runtime is retrievable via lookup
    const fetched = getRuntime(tenant, botId);
    expect(fetched).toBe(runtime);

    runtime.stop();
    destroyRuntime(tenant, botId);
    expect(getRuntime(tenant, botId)).toBeUndefined();
  });

  it('records tick history and retrieves it', async () => {
    const botId = 'r-history';
    const tenant = 't-history';
    const config: TradingBotConfig = {
      platform: 'coinbase',
      strategy: 'dca',
      symbols: ['BTC-USD'],
      maxPositionSizeUsd: 100,
      maxDailyLossUsd: 1000,
      maxOpenPositions: 1,
      stopLossPercent: 0.1,
      takeProfitPercent: 0.1,
      cooldownAfterLossMs: 0,
      paperTrading: true,
    };

    const runtime = createRuntime({ botId, tenantId: tenant, family: 'trading', platform: 'coinbase', config, adapter: stubTradingAdapter });
    runtime.start();

    await runtime.tick();
    await runtime.tick();
    await runtime.tick();

    const history = runtime.getTickHistory();
    expect(history.length).toBe(3);
    expect(history[0].botId).toBe(botId);

    const limited = runtime.getTickHistory(2);
    expect(limited.length).toBe(2);

    runtime.stop();
    destroyRuntime(tenant, botId);
  });

  it('serializes and restores state, preserving map fields', async () => {
    const botId = 'r-restore';
    const tenant = 't-restore';
    const config: TradingBotConfig = {
      platform: 'coinbase',
      strategy: 'dca',
      symbols: ['BTC-USD'],
      maxPositionSizeUsd: 100,
      maxDailyLossUsd: 1000,
      maxOpenPositions: 1,
      stopLossPercent: 0.1,
      takeProfitPercent: 0.1,
      cooldownAfterLossMs: 0,
      paperTrading: true,
    };

    const runtime1 = createRuntime({ botId, tenantId: tenant, family: 'trading', platform: 'coinbase', config, adapter: stubTradingAdapter });
    runtime1.start();
    await runtime1.tick();
    // tick once to populate priceHistories map
    const serialized = runtime1.serializeState();
    expect(serialized).not.toBeNull();

    // create a fresh runtime and restore state
    const runtime2 = createRuntime({ botId, tenantId: tenant, family: 'trading', platform: 'coinbase', config, adapter: stubTradingAdapter });
    runtime2.restoreState(serialized!);
    // after restore, maps should be real Maps
    const state = (runtime2 as any).getState();
    expect(state.engineState.priceHistories instanceof Map).toBe(true);

    // tick again without crashing
    const tick = await runtime2.tick();
    expect(['executed','skipped','error']).toContain(tick.result);

    runtime1.stop();
    destroyRuntime(tenant, botId);
    runtime2.stop();
    destroyRuntime(tenant, botId);
  });
});
