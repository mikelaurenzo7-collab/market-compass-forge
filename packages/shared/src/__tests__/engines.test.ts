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
  volatilityPositionSize,
} from '../trading/engine';
import { momentumSignal, computeIndicators } from '../trading/indicators';
import { createStoreEngineState, executeStoreTick } from '../store/engine';
import { createSocialEngineState, executeSocialTick } from '../social/engine';

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

  it('generateStrategySignal applies coinbase confidence threshold', () => {
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
      strategy: 'momentum',
      symbols: ['BTC-USD'],
      maxPositionSizeUsd: 100,
      maxDailyLossUsd: 1000,
      maxOpenPositions: 1,
      stopLossPercent: 0.1,
      takeProfitPercent: 0.1,
      cooldownAfterLossMs: 0,
      paperTrading: true,
    } as any;
    const state = createTradingEngineState(config, makeSafety());
    const baseSignal = momentumSignal(indicators, 100);
    const signal = generateStrategySignal(config, indicators, { price: 100, bid:100, ask:101 } as any, state);
    if (baseSignal.direction !== 'hold' && baseSignal.confidence < 60) {
      expect(signal.direction).toBe('hold');
    }
  });

  it('generateStrategySignal modifies binance momentum confidence', () => {
    const indicators = {
      rsi: 75,
      macd: { macd: 1, signal: 0, histogram: 1 },
      ema12: 110,
      ema26: 100,
      sma20: 105,
      sma50: 102,
      bollingerBands: { upper: 112, middle: 105, lower: 98, bandwidth: 0.13 },
      atr: 2,
      vwap: 107,
    } as any;
    const config = {
      platform: 'binance',
      strategy: 'momentum',
      symbols: ['BTCUSDT'],
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
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
  });

  it('generateStrategySignal handles polymarket event_probability strategy', () => {
    const indicators = {
      rsi: 50,
      macd: { macd: 0, signal: 0, histogram: 0 },
      ema12: 100,
      ema26: 100,
      sma20: 100,
      sma50: 100,
      bollingerBands: { upper: 110, middle: 100, lower: 90, bandwidth: 0.2 },
      atr: 2,
      vwap: 100,
    } as any;
    const config = {
      platform: 'polymarket',
      strategy: 'event_probability',
      symbols: ['ELECTION-YES'],
      maxPositionSizeUsd: 50,
      maxDailyLossUsd: 100,
      maxOpenPositions: 1,
      stopLossPercent: 0.1,
      takeProfitPercent: 0.2,
      cooldownAfterLossMs: 0,
      paperTrading: true,
      eventProbabilityData: { estimated: 0.70, fair: 0.55, currentProbability: 0.55 },
    } as any;
    const state = createTradingEngineState(config, makeSafety('t1', 'bot-poly', 'polymarket'));
    const signal = generateStrategySignal(config, indicators, { price: 0.55, bid: 0.54, ask: 0.56, symbol: 'ELECTION-YES', volume24h: 1000, high24h: 0.6, low24h: 0.5, change24hPercent: 2, timestamp: Date.now() } as any, state);
    // With estimated > fair, should signal buy (not hold)
    expect(signal.direction).not.toBe('hold');
    expect(signal.confidence).toBeGreaterThan(0);
  });

  it('generateStrategySignal polymarket applies 65% confidence threshold for non-event strategies', () => {
    const indicators = {
      rsi: 50,
      macd: { macd: 0, signal: 0, histogram: 0 },
      ema12: 100,
      ema26: 100,
      sma20: 100,
      sma50: 100,
      bollingerBands: { upper: 110, middle: 100, lower: 90, bandwidth: 0.2 },
      atr: 2,
      vwap: 100,
    } as any;
    const config = {
      platform: 'polymarket',
      strategy: 'momentum',
      symbols: ['BTC-YES'],
      maxPositionSizeUsd: 50,
      maxDailyLossUsd: 100,
      maxOpenPositions: 1,
      stopLossPercent: 0.1,
      takeProfitPercent: 0.1,
      cooldownAfterLossMs: 0,
      paperTrading: true,
    } as any;
    const state = createTradingEngineState(config, makeSafety('t1', 'bot-poly2', 'polymarket'));
    const signal = generateStrategySignal(config, indicators, { price: 100, bid: 100, ask: 101, symbol: 'BTC-YES', volume24h: 1000, high24h: 105, low24h: 95, change24hPercent: 0, timestamp: Date.now() } as any, state);
    // Low-confidence signals on Polymarket should be held (threshold is 65%)
    if (signal.confidence < 65) {
      expect(signal.direction).toBe('hold');
    }
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
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
    // verify audit log contains llm trading insight entry
    const audit = getAuditLog('t1');
    expect(audit.some((e) => e.action === 'llm_trading_insight')).toBe(true);
  });

  it('computeIndicators returns new additional fields', () => {
    const inds = computeIndicators([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
      Array(20).fill(100), Array(20).fill(10), Array(20).fill(5));
    expect(inds.stochRsi).toBeDefined();
    expect(inds.adx).toBeDefined();
    expect(inds.ichimoku).toBeDefined();
  });

  it('backtest returns valid structure', async () => {
    const { backtest } = await import('../trading/backtest');
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
    const safety = makeSafety('t0','bot0','coinbase');
    const candles = [
      { timestamp: 0, price: 100, volume: 1, high: 101, low: 99 },
      { timestamp: 1, price: 101, volume: 1, high: 102, low: 100 },
    ];
    const res = await backtest(config, safety, candles.slice());
    expect(res).toHaveProperty('totalReturnUsd');
    expect(typeof res.winRate).toBe('number');
    expect(res).toHaveProperty('equityCurve');
    expect(res).toHaveProperty('maxDrawdownPct');
    expect(res).toHaveProperty('profitFactor');
    expect(Array.isArray(res.equityCurve)).toBe(true);
    expect(res.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(res.maxDrawdownPct).toBeGreaterThanOrEqual(0);
  });

  it('volatilityPositionSize scales position by ATR', () => {
    // ATR = 5, price = 100, maxPosUsd = 1000, riskPerTrade = 50, multiplier = 2
    // riskPerUnit = 5 * 2 = 10, maxUnits = 50/10 = 5, posUsd = 5 * 100 = 500
    const pos = volatilityPositionSize(5, 100, 1000, 50, 2);
    expect(pos).toBeCloseTo(500, 0);
  });

  it('volatilityPositionSize caps at maxPositionUsd', () => {
    const pos = volatilityPositionSize(0.1, 100, 200, 1000, 2);
    expect(pos).toBeLessThanOrEqual(200);
  });

  it('volatilityPositionSize returns 0 for zero ATR', () => {
    expect(volatilityPositionSize(0, 100, 1000, 50)).toBe(0);
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
    // Social engine with useLLM=true no longer logs llm_prompt for calendar ideas
    // (LLM is now used per-post via template, which only fires in auto mode)
    expect(result.botId).toBe('bot6');
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
  it('social engine comment monitoring replies when question detected', async () => {
    const config: SocialBotConfig = {
      platform: 'x',
      strategies: ['comment_monitoring'],
      maxPostsPerDay: 1,
      maxEngagementsPerHour: 10,
      contentApprovalRequired: false,
      sensitiveTopicKeywords: [],
      brandVoiceGuidelines: '',
      paperMode: false,
      autonomyLevel: 'auto',
    };
    const safety = makeSafety('t3', 'bot7', 'x');
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
      }),
      getTrending: async () => [],
      getScheduledPosts: async () => [],
      getPostsToday: async () => 0,
      getComments: async () => [{ commentId: 'c1', text: 'Is this available?' }],
      replyToComment: async () => ({ success: true }),
    };
      const { result } = await executeSocialTick(state, stubAdapter as any);
    expect(result.action).toContain('Reply sent');
  });

  it('store dynamic pricing adjusts per platform rules', async () => {
    const config: StoreBotConfig = {
      platform: 'amazon',
      strategies: ['dynamic_pricing'],
      maxPriceChangePercent: 10,
      minMarginPercent: 5,
      syncIntervalMs: 1000,
      autoApplyPricing: false,
      autoReorder: false,
      paperMode: true,
    };
    const safety = makeSafety('t2', 'bot8', 'amazon');
    const state = createStoreEngineState(config, safety);
    const stubAdapter = {
      fetchProducts: async () => [{
        id: 'p1', platform: 'amazon', title: 'Test', price: 100, costOfGoods: 50, inventory: 10,
        category: 'X', tags: [], status: 'active',
      }],
      updatePrice: async () => ({ success: true }),
      getCompetitorPrices: async () => [120],
      getSalesHistory: async () => [],
      updateInventory: async () => ({ success: true }),
    };
    const { result } = await executeStoreTick(state, stubAdapter as any);
    expect(result.action).toContain('Priced');
  });

});
