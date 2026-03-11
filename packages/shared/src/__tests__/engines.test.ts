import { describe, it, expect } from 'vitest';
import type { SafetyContext, BotFamily, TradingBotConfig, StoreBotConfig, SocialBotConfig } from '../index';
import {
  createDefaultBudget,
  createDefaultCircuitBreaker,
  createDefaultPolicies,
  getAuditLog,
} from '../index';
import {
  createTradingEngineState,
  executeTradingTick,
  generateStrategySignal,
} from '../trading/engine';
import { createStoreEngineState, executeStoreTick } from '../store/engine.js';
import { createSocialEngineState, executeSocialTick } from '../social/engine.js';

// simple dummy contexts/adapters used only for testing
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

describe('engine units', () => {
  it('trading engine tick returns skip with stub adapter', async () => {
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
    const safety = makeSafety('t1', 'bot1', 'coinbase');
    const state = createTradingEngineState(config, safety);

    const stubAdapter = {
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

    const { result, newState } = await executeTradingTick(state, stubAdapter as any);
    expect(result.botId).toBe('bot1');
    expect(['executed', 'skipped']).toContain(result.result);
    expect(newState).toBeDefined();
  });

  it('trading engine processes multiple symbols and updates histories', async () => {
    const config: TradingBotConfig = {
      platform: 'coinbase',
      strategy: 'dca',
      symbols: ['BTC-USD', 'ETH-USD'],
      maxPositionSizeUsd: 100,
      maxDailyLossUsd: 1000,
      maxOpenPositions: 2,
      stopLossPercent: 0.1,
      takeProfitPercent: 0.1,
      cooldownAfterLossMs: 0,
      paperTrading: true,
    };
    const safety = makeSafety('t1', 'bot1', 'coinbase');
    const state = createTradingEngineState(config, safety);

    const stubAdapter = {
      fetchMarketData: async (symbol: string) => ({
        symbol,
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

    const { result, newState } = await executeTradingTick(state, stubAdapter as any);
    expect(result.botId).toBe('bot1');
    expect(['executed', 'skipped']).toContain(result.result);
    expect(newState.priceHistories.size).toBe(2);
    expect(newState.priceHistories.has('BTC-USD')).toBe(true);
    expect(newState.priceHistories.has('ETH-USD')).toBe(true);
  });

  it('generateStrategySignal returns hold for grid with no levels', () => {
    const indicators = {
      rsi: 50,
      macd: { macd: 0, signal: 0, histogram: 0 },
      ema12: 0,
      ema26: 0,
      sma20: 0,
      sma50: 0,
      bollingerBands: { upper: 0, middle: 0, lower: 0, bandwidth: 0 },
      atr: 0,
      vwap: 0,
    } as any;
    const config = {
      platform: 'coinbase',
      strategy: 'grid',
      symbols: ['BTC-USD'],
      gridLevels: [],
      openOrders: [],
      maxPositionSizeUsd: 100,
      maxDailyLossUsd: 1000,
      maxOpenPositions: 1,
      stopLossPercent: 0.1,
      takeProfitPercent: 0.1,
      cooldownAfterLossMs: 0,
      paperTrading: true,
    } as any;
    const state = createTradingEngineState(config, makeSafety());
    const signal = generateStrategySignal(config, indicators, { price: 100, bid:100, ask:101 } as any, state);
    expect(signal.direction).toBe('hold');
  });

  it('store engine tick handles empty product list', async () => {
    const config: StoreBotConfig = {
      platform: 'shopify',
      strategies: ['dynamic_pricing'],
      maxPriceChangePercent: 10,
      minMarginPercent: 5,
      syncIntervalMs: 1000,
      autoApplyPricing: false,
      autoReorder: false,
      paperMode: true,
    };
    const safety = makeSafety('t2', 'bot2', 'shopify');
    const state = createStoreEngineState(config, safety);
    const stubAdapter = {
      fetchProducts: async () => [],
      updatePrice: async () => ({ success: true }),
      getCompetitorPrices: async () => [],
      getSalesHistory: async () => [],
      updateInventory: async () => ({ success: true }),
    };

    const { result, newState } = await executeStoreTick(state, stubAdapter as any);
    expect(result.botId).toBe('bot2');
  });

  it('store engine competitor monitoring produces alert', async () => {
    const config: StoreBotConfig = {
      platform: 'shopify',
      strategies: ['competitor_monitoring'],
      maxPriceChangePercent: 10,
      minMarginPercent: 5,
      syncIntervalMs: 1000,
      autoApplyPricing: false,
      autoReorder: false,
      paperMode: true,
    };
    const safety = makeSafety('t2', 'bot3', 'shopify');
    const state = createStoreEngineState(config, safety);
    const stubAdapter = {
      fetchProducts: async () => [{
        id: 'p1',
        platform: 'shopify',
        title: 'Test',
        price: 100,
        costOfGoods: 50,
        inventory: 10,
        category: 'X',
        tags: [],
        status: 'active',
      }],
      updatePrice: async () => ({ success: true }),
      getCompetitorPrices: async () => [80],
      getSalesHistory: async () => [],
      updateInventory: async () => ({ success: true }),
    };
    const { result } = await executeStoreTick(state, stubAdapter as any);
    expect(result.action).toContain('⚠️');
    expect(result.result).toBe('executed');
  });

  it('store engine review management emits placeholder action', async () => {
    const config: StoreBotConfig = {
      platform: 'shopify',
      strategies: ['review_management'],
      maxPriceChangePercent: 10,
      minMarginPercent: 5,
      syncIntervalMs: 1000,
      autoApplyPricing: false,
      autoReorder: false,
      paperMode: true,
    };
    const safety = makeSafety('t2', 'bot4', 'shopify');
    const state = createStoreEngineState(config, safety);
    const stubAdapter = {
      fetchProducts: async () => [],
      updatePrice: async () => ({ success: true }),
      getCompetitorPrices: async () => [],
      getSalesHistory: async () => [],
      updateInventory: async () => ({ success: true }),
    };
    const { result } = await executeStoreTick(state, stubAdapter as any);
    expect(result.action).toContain('🛎️');
  });

  it('trading engine logs llm prompt when enabled', async () => {
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
      useLLM: true,
    };
    const safety = makeSafety('t1', 'bot5', 'coinbase');
    const state = createTradingEngineState(config, safety);
    // preload enough history to pass indicator gate in executeTradingTick
    state.priceHistories.set('BTC-USD', {
      prices: Array.from({ length: 21 }, (_, i) => 100 + i),
      volumes: Array.from({ length: 21 }, () => 1000),
      highs: Array.from({ length: 21 }, (_, i) => 101 + i),
      lows: Array.from({ length: 21 }, (_, i) => 99 + i),
      maxLength: 200,
    });
    state.lastDcaBuy.set('BTC-USD', 0);
    const stubAdapter = {
      fetchMarketData: async () => ({
        symbol: 'BTC-USD',
        price: 150,
        volume24h: 1000,
        high24h: 155,
        low24h: 145,
        change24hPercent: 2,
        bid: 149,
        ask: 151,
        timestamp: Date.now(),
      }),
      placeOrder: async () => ({ orderId: 'x', filled: true }),
      getPositions: async () => [],
      getBalance: async () => ({ availableUsd: 10000, totalUsd: 10000 }),
    };
    const { result } = await executeTradingTick(state, stubAdapter as any);
    expect(result.botId).toBe('bot5');
    // verify audit log contains llm_prompt entry
    const audit = getAuditLog('t1');
    expect(audit.some((e) => e.action === 'llm_prompt')).toBe(true);
  });

  it('social engine llm prompt logs when useLLM true', async () => {
    const config: SocialBotConfig = {
      platform: 'x',
      strategies: ['content_calendar'],
      maxPostsPerDay: 1,
      maxEngagementsPerHour: 10,
      contentApprovalRequired: false,
      sensitiveTopicKeywords: [],
      brandVoiceGuidelines: '',
      paperMode: true,
      useLLM: true,
    };
    const safety = makeSafety('t3', 'bot6', 'x');
    const state = createSocialEngineState(config, safety);
    const stubAdapter = {
      publishPost: async () => ({ postId: 'p', success: true }),
      getMetrics: async () => ({
        platform: 'x',
        followers: 0,
        followersGrowthPercent: 0,
        engagementRate: 0,
        avgReach: 0,
        bestPostingHours: [],
        topHashtags: [],
        audienceTimezone: 'UTC',
      }),
      getTrending: async () => [],
      getScheduledPosts: async () => [],
      getPostsToday: async () => 0,
    };
    const { result } = await executeSocialTick(state, stubAdapter as any);
    expect(result.botId).toBe('bot6');
    const audit = getAuditLog('t3');
    expect(audit.some((e) => e.action === 'llm_prompt')).toBe(true);
  });

  it('social engine tick handles calendar when no slots due', async () => {
    const config: SocialBotConfig = {
      platform: 'x',
      strategies: ['content_calendar'],
      maxPostsPerDay: 1,
      maxEngagementsPerHour: 10,
      contentApprovalRequired: false,
      sensitiveTopicKeywords: [],
      brandVoiceGuidelines: '',
      paperMode: true,
    };
    const safety = makeSafety('t3', 'bot3', 'x');
    const state = createSocialEngineState(config, safety);
    const stubAdapter = {
      publishPost: async () => ({ postId: 'p', success: true }),
      getMetrics: async () => ({
        platform: 'x',
        followers: 0,
        followersGrowthPercent: 0,
        engagementRate: 0,
        avgReach: 0,
        bestPostingHours: [],
        topHashtags: [],
        audienceTimezone: 'UTC',
      }),
      getTrending: async () => [],
      getScheduledPosts: async () => [],
      getPostsToday: async () => 0,
    };

    const { result, newState } = await executeSocialTick(state, stubAdapter as any);
    expect(result.botId).toBe('bot3');
    expect(['skipped', 'executed']).toContain(result.result);
    expect(newState).toBeDefined();
  });

  it('social engine engagement automation triggers boost action', async () => {
    const config: SocialBotConfig = {
      platform: 'x',
      strategies: ['engagement_automation'],
      maxPostsPerDay: 1,
      maxEngagementsPerHour: 10,
      contentApprovalRequired: false,
      sensitiveTopicKeywords: [],
      brandVoiceGuidelines: '',
      paperMode: true,
    };
    const safety = makeSafety('t3', 'bot4', 'x');
    const state = createSocialEngineState(config, safety);
    const stubAdapter = {
      publishPost: async () => ({ postId: 'p', success: true }),
      getMetrics: async () => ({
        platform: 'x',
        followers: 0,
        followersGrowthPercent: 0,
        engagementRate: 0.1,
        avgReach: 0,
        bestPostingHours: [],
        topHashtags: [],
        audienceTimezone: 'UTC',
      }),
      getTrending: async () => [],
      getScheduledPosts: async () => [],
      getPostsToday: async () => 0,
    };
    const { result } = await executeSocialTick(state, stubAdapter as any);
    expect(result.action).toContain('boost');
  });

  it('social engine hashtag optimization logs hashtags', async () => {
    const config: SocialBotConfig = {
      platform: 'x',
      strategies: ['hashtag_optimization'],
      maxPostsPerDay: 1,
      maxEngagementsPerHour: 10,
      contentApprovalRequired: false,
      sensitiveTopicKeywords: [],
      brandVoiceGuidelines: '',
      paperMode: true,
    };
    const safety = makeSafety('t3', 'bot5', 'x');
    const state = createSocialEngineState(config, safety);
    const stubAdapter = {
      publishPost: async () => ({ postId: 'p', success: true }),
      getMetrics: async () => ({
        platform: 'x',
        followers: 0,
        followersGrowthPercent: 0,
        engagementRate: 0,
        avgReach: 0,
        bestPostingHours: [],
        topHashtags: ['tag1', 'tag2'],
        audienceTimezone: 'UTC',
      }),
      getTrending: async () => [],
      getScheduledPosts: async () => [],
      getPostsToday: async () => 0,
    };
    const { result } = await executeSocialTick(state, stubAdapter as any);
    expect(result.action).toContain('#️⃣');
  });
});
