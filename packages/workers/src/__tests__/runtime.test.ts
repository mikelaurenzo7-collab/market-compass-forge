import { describe, it, expect } from 'vitest';
import { createRuntime, getRuntime, listRuntimes, destroyRuntime, bootstrapWorkers, BotRuntime } from '../index.js';
import type { TradingBotConfig, StoreBotConfig, SocialBotConfig, WorkforceBotConfig } from '@beastbots/shared';

// ─── Stub Adapters ────────────────────────────────────────────

const stubTradingAdapter = {
  platform: 'coinbase' as const,
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

const stubStoreAdapter = {
  platform: 'shopify' as const,
  fetchProducts: async () => [],
  updatePrice: async () => ({ success: true }),
  getCompetitorPrices: async () => [],
  getSalesHistory: async () => [],
  updateInventory: async () => ({ success: true }),
};

const stubSocialAdapter = {
  platform: 'x' as const,
  publishPost: async () => ({ postId: 'p1', success: true }),
  getMetrics: async () => ({
    platform: 'x' as const,
    followers: 1000,
    followersGrowthPercent: 2.5,
    engagementRate: 3.2,
    avgReach: 500,
    bestPostingHours: [9, 12, 17],
    topHashtags: ['#ai', '#bots'],
    audienceTimezone: 'UTC',
  }),
  getTrending: async () => [],
  getScheduledPosts: async () => [],
  getPostsToday: async () => 0,
};

const stubWorkforceAdapter = {
  category: 'customer_support' as const,
  fetchPendingTasks: async () => [],
  executeTask: async (task: any) => ({
    taskId: task.id ?? 'stub',
    status: 'completed' as const,
    success: true,
    action: 'stub',
    details: {},
    durationMs: 0,
    escalated: false,
  }),
  escalateTask: async () => ({ success: true }),
  getTaskHistory: async () => [],
  sendNotification: async () => ({ success: true }),
};

// ─── Base Configs ─────────────────────────────────────────────

const tradingConfig: TradingBotConfig = {
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

const storeConfig: StoreBotConfig = {
  platform: 'shopify',
  strategy: 'dynamic_pricing',
  maxPriceChangePercent: 10,
  minMarginPercent: 20,
  competitorCheckInterval: 300_000,
  paperTrading: true,
};

const socialConfig: SocialBotConfig = {
  platform: 'x',
  strategy: 'content_calendar',
  maxPostsPerDay: 5,
  brandVoice: 'professional and witty',
  brandDescription: 'AI automation startup',
  contentPillars: ['thought_leadership', 'product_updates'],
  requireApproval: false,
  paperTrading: true,
};

const workforceConfig: WorkforceBotConfig = {
  platform: 'customer_support',
  strategy: 'ticket_triage',
  maxTasksPerHour: 50,
  escalationThreshold: 0.8,
  autoExecute: false,
  paperTrading: true,
};

// ─── Trading Runtime ──────────────────────────────────────────

describe('trading runtime', () => {
  it('creates, starts, ticks, and records metrics', async () => {
    const runtime = createRuntime({
      botId: 'r1', tenantId: 't1', family: 'trading', platform: 'coinbase',
      config: tradingConfig, adapter: stubTradingAdapter,
    });
    expect(runtime.getStatus()).toBe('idle');

    const started = runtime.start();
    expect(started.ok).toBe(true);
    expect(runtime.getStatus()).toBe('running');

    const tick1 = await runtime.tick();
    await runtime.tick();
    expect(tick1.botId).toBe('r1');
    expect(['executed', 'skipped']).toContain(tick1.result);

    const metrics = runtime.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics?.totalTicks).toBeGreaterThanOrEqual(2);

    expect(getRuntime('t1', 'r1')).toBe(runtime);
    runtime.stop();
    destroyRuntime('t1', 'r1');
    expect(getRuntime('t1', 'r1')).toBeUndefined();
  });

  it('records tick history and retrieves it', async () => {
    const runtime = createRuntime({
      botId: 'r-hist', tenantId: 't-hist', family: 'trading', platform: 'coinbase',
      config: tradingConfig, adapter: stubTradingAdapter,
    });
    runtime.start();

    await runtime.tick();
    await runtime.tick();
    await runtime.tick();

    const history = runtime.getTickHistory();
    expect(history.length).toBe(3);
    expect(history[0].botId).toBe('r-hist');
    expect(runtime.getTickHistory(2).length).toBe(2);

    runtime.stop();
    destroyRuntime('t-hist', 'r-hist');
  });
});

// ─── Store Runtime ────────────────────────────────────────────

describe('store runtime', () => {
  it('creates and ticks store bot', async () => {
    const runtime = createRuntime({
      botId: 'store1', tenantId: 'ts', family: 'store', platform: 'shopify',
      config: storeConfig, adapter: stubStoreAdapter,
    });
    runtime.start();
    const tick = await runtime.tick();
    expect(tick.botId).toBe('store1');
    expect(['executed', 'skipped', 'error']).toContain(tick.result);

    const state = runtime.getState();
    expect(state?.family).toBe('store');
    expect(state?.platform).toBe('shopify');

    runtime.stop();
    destroyRuntime('ts', 'store1');
  });
});

// ─── Social Runtime ───────────────────────────────────────────

describe('social runtime', () => {
  it('creates and ticks social bot', async () => {
    const runtime = createRuntime({
      botId: 'social1', tenantId: 'ts', family: 'social', platform: 'x',
      config: socialConfig, adapter: stubSocialAdapter,
    });
    runtime.start();
    const tick = await runtime.tick();
    expect(tick.botId).toBe('social1');
    expect(['executed', 'skipped', 'error']).toContain(tick.result);

    const state = runtime.getState();
    expect(state?.family).toBe('social');
    expect(state?.platform).toBe('x');

    runtime.stop();
    destroyRuntime('ts', 'social1');
  });
});

// ─── Workforce Runtime ───────────────────────────────────────

describe('workforce runtime', () => {
  it('creates and ticks workforce bot', async () => {
    const runtime = createRuntime({
      botId: 'wf1', tenantId: 'tw', family: 'workforce', platform: 'customer_support',
      config: workforceConfig, adapter: stubWorkforceAdapter,
    });
    runtime.start();
    const tick = await runtime.tick();
    expect(tick.botId).toBe('wf1');
    expect(['executed', 'skipped', 'error']).toContain(tick.result);

    const state = runtime.getState();
    expect(state?.family).toBe('workforce');

    runtime.stop();
    destroyRuntime('tw', 'wf1');
  });

  it('keeps the configured workforce category inside engine state', () => {
    const runtime = createRuntime({
      botId: 'wf-category', tenantId: 'tw', family: 'workforce', platform: 'slack' as any,
      config: {
        category: 'customer_support',
        strategies: ['task_orchestration'],
        maxTasksPerHour: 40,
        maxConcurrentTasks: 2,
        requireApprovalForExternal: true,
        escalationThresholdConfidence: 0.8,
        dataAccessScopes: ['tickets'],
        paperMode: true,
        autonomyLevel: 'manual',
      },
      adapter: stubWorkforceAdapter,
    });

    const state = runtime.getState();
    expect(state?.family).toBe('workforce');
    expect(state?.platform).toBe('slack');
    expect((state?.engineState as any)?.config?.category).toBe('customer_support');

    runtime.stop();
    destroyRuntime('tw', 'wf-category');
  });
});

// ─── Lifecycle & Safety ───────────────────────────────────────

describe('bot lifecycle', () => {
  it('pause and resume', async () => {
    const runtime = createRuntime({
      botId: 'lc1', tenantId: 'tlc', family: 'trading', platform: 'coinbase',
      config: tradingConfig, adapter: stubTradingAdapter,
    });
    runtime.start();
    expect(runtime.getStatus()).toBe('running');

    runtime.pause();
    expect(runtime.getStatus()).toBe('paused');

    // Ticking while paused should skip
    const tick = await runtime.tick();
    expect(tick.result).toBe('skipped');

    // Resume not available directly — must call start() again after unpausing
    runtime.stop();
    destroyRuntime('tlc', 'lc1');
  });

  it('kill switch trips circuit breaker', async () => {
    const runtime = createRuntime({
      botId: 'kill1', tenantId: 'tk', family: 'trading', platform: 'coinbase',
      config: tradingConfig, adapter: stubTradingAdapter,
    });
    runtime.start();
    const killResult = runtime.killSwitch();
    expect(killResult.ok).toBe(true);
    expect(killResult.status).toBe('stopped');

    // Should not restart after kill
    const restartResult = runtime.start();
    expect(restartResult.ok).toBe(false);

    runtime.stop();
    destroyRuntime('tk', 'kill1');
  });

  it('state change callback fires', async () => {
    let callbackState: any = null;
    const runtime = createRuntime({
      botId: 'cb1', tenantId: 'tcb', family: 'trading', platform: 'coinbase',
      config: tradingConfig, adapter: stubTradingAdapter,
      onStateChange: (state) => { callbackState = state; },
    });

    runtime.start();
    expect(callbackState).not.toBeNull();
    expect(callbackState.status).toBe('running');

    runtime.stop();
    expect(callbackState.status).toBe('stopped');
    destroyRuntime('tcb', 'cb1');
  });
});

// ─── Serialization / Restore ──────────────────────────────────

describe('state serialization', () => {
  it('serializes and restores state across runtimes', async () => {
    const r1 = createRuntime({
      botId: 'ser1', tenantId: 'ts', family: 'trading', platform: 'coinbase',
      config: tradingConfig, adapter: stubTradingAdapter,
    });
    r1.start();
    await r1.tick();
    await r1.tick();
    await r1.tick();

    const serialized = r1.serializeState();
    expect(serialized).not.toBeNull();
    expect(serialized!.status).toBe('running');

    // Create a new runtime and restore state
    const r2 = new BotRuntime();
    r2.initialize({
      botId: 'ser1', tenantId: 'ts', family: 'trading', platform: 'coinbase',
      config: tradingConfig, adapter: stubTradingAdapter,
    });
    r2.restoreState(serialized!);

    const metrics = r2.getMetrics();
    expect(metrics?.totalTicks).toBe(3);
    expect(r2.getStatus()).toBe('running');
    expect(r2.getTickHistory().length).toBe(3);
    expect((r2.getState()?.engineState as any)?.priceHistories).toBeInstanceOf(Map);

    r1.stop();
    r2.stop();
    destroyRuntime('ts', 'ser1');
  });

  it('syncs trading engine pnl into runtime metrics', async () => {
    const runtime = createRuntime({
      botId: 'pnl-sync', tenantId: 'ts', family: 'trading', platform: 'coinbase',
      config: tradingConfig, adapter: stubTradingAdapter,
    });

    const state = runtime.getState();
    expect(state).not.toBeNull();
    (state!.engineState as any).totalPnl = 42.5;

    runtime.start();
    await runtime.tick();

    expect(runtime.getMetrics()?.totalPnlUsd).toBe(42.5);

    runtime.stop();
    destroyRuntime('ts', 'pnl-sync');
  });
});

// ─── Multi-Tenant Registry ───────────────────────────────────

describe('runtime registry', () => {
  it('lists runtimes by tenant', () => {
    const r1 = createRuntime({
      botId: 'a', tenantId: 'multi', family: 'trading', platform: 'coinbase',
      config: tradingConfig, adapter: stubTradingAdapter,
    });
    const r2 = createRuntime({
      botId: 'b', tenantId: 'multi', family: 'store', platform: 'shopify',
      config: storeConfig, adapter: stubStoreAdapter,
    });
    const r3 = createRuntime({
      botId: 'c', tenantId: 'other', family: 'social', platform: 'x',
      config: socialConfig, adapter: stubSocialAdapter,
    });

    const multiRuntimes = listRuntimes('multi');
    expect(multiRuntimes).toHaveLength(2);
    expect(multiRuntimes).toContain(r1);
    expect(multiRuntimes).toContain(r2);

    const otherRuntimes = listRuntimes('other');
    expect(otherRuntimes).toHaveLength(1);
    expect(otherRuntimes).toContain(r3);

    expect(listRuntimes('nonexistent')).toHaveLength(0);

    destroyRuntime('multi', 'a');
    destroyRuntime('multi', 'b');
    destroyRuntime('other', 'c');
  });
});

// ─── Bootstrap ────────────────────────────────────────────────

describe('bootstrapWorkers', () => {
  it('returns ready status', () => {
    const result = bootstrapWorkers();
    expect(result.ok).toBe(true);
    expect(result.message).toContain('Durable Objects');
  });
});
