import type { TradingPlatform, MarketData, TradeSignal, Position, TradingBotConfig, TickResult } from '../index.js';
import type { SafetyContext } from '../safety.js';
import { runSafetyPipeline, logAuditEntry, recordError, recordSuccess, recordSpend } from '../safety.js';
import { promptLLM } from '../llm.js';
import { computeIndicators, momentumSignal, meanReversionSignal, dcaSignal, gridSignal, arbitrageSignal, marketMakingSignal, eventProbabilitySignal } from './indicators.js';

// ─── Platform Adapter Interface ───────────────────────────────

export interface TradingAdapter {
  platform: TradingPlatform;
  fetchMarketData(symbol: string): Promise<MarketData>;
  placeOrder(signal: TradeSignal): Promise<{ orderId: string; filled: boolean }>;
  getPositions(): Promise<Position[]>;
  getBalance(): Promise<{ availableUsd: number; totalUsd: number }>;
}

// ─── Price History Store ──────────────────────────────────────

export interface PriceHistory {
  prices: number[];
  volumes: number[];
  highs: number[];
  lows: number[];
  maxLength: number;
}

export function createPriceHistory(maxLength: number = 200): PriceHistory {
  return { prices: [], volumes: [], highs: [], lows: [], maxLength };
}

export function pushPriceData(
  history: PriceHistory,
  data: MarketData
): PriceHistory {
  const prices = [...history.prices, data.price].slice(-history.maxLength);
  const volumes = [...history.volumes, data.volume24h].slice(-history.maxLength);
  const highs = [...history.highs, data.high24h].slice(-history.maxLength);
  const lows = [...history.lows, data.low24h].slice(-history.maxLength);
  return { ...history, prices, volumes, highs, lows };
}

// ─── Position Sizing (Kelly Criterion) ────────────────────────

export function kellyPositionSize(
  winRate: number,
  avgWin: number,
  avgLoss: number,
  maxPositionUsd: number,
  availableBalanceUsd: number,
  fractionMultiplier: number = 0.25 // quarter-Kelly for safety
): number {
  if (avgLoss === 0) return 0;
  const b = avgWin / avgLoss;
  const kelly = (winRate * b - (1 - winRate)) / b;
  const adjustedKelly = Math.max(0, kelly * fractionMultiplier);
  return Math.min(adjustedKelly * availableBalanceUsd, maxPositionUsd);
}

// ─── Trading Engine Core ──────────────────────────────────────

export interface TradingEngineState {
  config: TradingBotConfig;
  safety: SafetyContext;
  priceHistories: Map<string, PriceHistory>;
  lastDcaBuy: Map<string, number>;
  consecutiveLosses: number;
  totalPnl: number;
  totalTrades: number;
  winningTrades: number;
}

export function createTradingEngineState(
  config: TradingBotConfig,
  safety: SafetyContext
): TradingEngineState {
  return {
    config,
    safety,
    priceHistories: new Map(),
    lastDcaBuy: new Map(),
    consecutiveLosses: 0,
    totalPnl: 0,
    totalTrades: 0,
    winningTrades: 0,
  };
}

export async function executeTradingTick(
  state: TradingEngineState,
  adapter: TradingAdapter
): Promise<{ result: TickResult; newState: TradingEngineState }> {
  const startTime = Date.now();
  let newState = { ...state };

  try {
    const positions = await adapter.getPositions();
    const balance = await adapter.getBalance();

    for (const symbol of state.config.symbols) {
      // Fetch market data and update history
      const marketData = await adapter.fetchMarketData(symbol);
      const existingHistory = state.priceHistories.get(symbol) ?? createPriceHistory();
      const updatedHistory = pushPriceData(existingHistory, marketData);
      newState.priceHistories = new Map(newState.priceHistories);
      newState.priceHistories.set(symbol, updatedHistory);

      if (updatedHistory.prices.length < 20) continue; // Not enough data yet

      // Compute indicators
      const indicators = computeIndicators(
        updatedHistory.prices,
        updatedHistory.volumes,
        updatedHistory.highs,
        updatedHistory.lows
      );

      // Generate signal based on strategy
      const signal = generateStrategySignal(state.config, indicators, marketData, state);
      if (signal.direction === 'hold') continue;

      // Check if we can open more positions
      if (signal.direction === 'buy' && positions.length >= state.config.maxOpenPositions) continue;

      // Position sizing
      const winRate = state.totalTrades > 0 ? state.winningTrades / state.totalTrades : 0.5;
      const positionSize = state.config.paperTrading
        ? state.config.maxPositionSizeUsd * 0.1
        : kellyPositionSize(winRate, 1.5, 1, state.config.maxPositionSizeUsd, balance.availableUsd);

      if (positionSize <= 0) continue;

      const estimatedCost = signal.direction === 'buy' ? positionSize : 0;

      // Optionally ask LLM for reasoning before running safety
      if (state.config.useLLM) {
        try {
          const prompt = `Signal decision for ${state.config.platform} ${symbol}: direction=${signal.direction}, confidence=${signal.confidence}, indicators=${JSON.stringify(signal.indicators)}`;
          const llmResp = await promptLLM(prompt);
          logAuditEntry({
            tenantId: state.safety.tenantId,
            botId: state.safety.botId,
            platform: state.config.platform,
            action: 'llm_prompt',
            result: 'success',
            riskLevel: 'low',
            details: { prompt, response: llmResp },
          });
        } catch (err) {
          console.warn('LLM error', err);
        }
      }

      // Run safety pipeline
      const safetyResult = runSafetyPipeline(
        state.safety,
        `${signal.direction} ${symbol}`,
        estimatedCost,
        signal.confidence > 70 ? 'low' : 'medium'
      );

      if (!safetyResult.allowed) {
        return {
          result: {
            botId: state.safety.botId,
            timestamp: Date.now(),
            action: `${signal.direction} ${symbol}`,
            result: 'denied',
            details: { reason: safetyResult.reason },
            durationMs: Date.now() - startTime,
          },
          newState,
        };
      }

      // Execute trade (or simulate in paper mode)
      const tradeSignal: TradeSignal = {
        platform: state.config.platform,
        symbol,
        side: signal.direction === 'buy' ? 'buy' : 'sell',
        type: 'market',
        quantity: positionSize / marketData.price,
        confidence: signal.confidence,
        strategy: state.config.strategy,
        indicators: signal.indicators,
        timestamp: Date.now(),
      };

      if (state.config.paperTrading) {
        logAuditEntry({
          tenantId: state.safety.tenantId,
          botId: state.safety.botId,
          platform: state.config.platform,
          action: `PAPER_${signal.direction.toUpperCase()} ${symbol}`,
          result: 'success',
          riskLevel: 'low',
          details: { signal: tradeSignal, paperMode: true },
        });

        return {
          result: {
            botId: state.safety.botId,
            timestamp: Date.now(),
            action: `paper_${signal.direction} ${symbol}`,
            result: 'executed',
            details: { signal: tradeSignal, paperMode: true },
            durationMs: Date.now() - startTime,
          },
          newState,
        };
      }

      const autonomy = state.config.autonomyLevel ?? 'manual';
      if (autonomy !== 'auto') {
        return {
          result: {
            botId: state.safety.botId,
            timestamp: Date.now(),
            action: `${signal.direction} ${symbol}`,
            result: 'skipped',
            details: {
              reason: 'autonomy_not_auto',
              autonomyLevel: autonomy,
              suggestedSignal: tradeSignal,
            },
            durationMs: Date.now() - startTime,
          },
          newState,
        };
      }

      const orderResult = await adapter.placeOrder(tradeSignal);

      // Update budget
      newState.safety = {
        ...newState.safety,
        budget: recordSpend(newState.safety.budget, estimatedCost),
        circuitBreaker: recordSuccess(newState.safety.circuitBreaker),
      };

      logAuditEntry({
        tenantId: state.safety.tenantId,
        botId: state.safety.botId,
        platform: state.config.platform,
        action: `${signal.direction.toUpperCase()} ${symbol}`,
        result: 'success',
        riskLevel: 'low',
        details: { orderId: orderResult.orderId, signal: tradeSignal },
      });

      return {
        result: {
          botId: state.safety.botId,
          timestamp: Date.now(),
          action: `${signal.direction} ${symbol}`,
          result: 'executed',
          details: { orderId: orderResult.orderId, signal: tradeSignal },
          durationMs: Date.now() - startTime,
        },
        newState,
      };
    }

    // No signals triggered
    return {
      result: {
        botId: state.safety.botId,
        timestamp: Date.now(),
        action: 'scan',
        result: 'skipped',
        details: { symbols: state.config.symbols, reason: 'no_signal' },
        durationMs: Date.now() - startTime,
      },
      newState,
    };
  } catch (error) {
    newState.safety = {
      ...newState.safety,
      circuitBreaker: recordError(newState.safety.circuitBreaker),
    };

    logAuditEntry({
      tenantId: state.safety.tenantId,
      botId: state.safety.botId,
      platform: state.config.platform,
      action: 'tick_error',
      result: 'failure',
      riskLevel: 'high',
      details: { error: error instanceof Error ? error.message : String(error) },
    });

    return {
      result: {
        botId: state.safety.botId,
        timestamp: Date.now(),
        action: 'tick',
        result: 'error',
        details: { error: error instanceof Error ? error.message : String(error) },
        durationMs: Date.now() - startTime,
      },
      newState,
    };
  }
}

// ─── Strategy Router ──────────────────────────────────────────

export function generateStrategySignal(
  config: TradingBotConfig,
  indicators: ReturnType<typeof computeIndicators>,
  marketData: MarketData,
  state: TradingEngineState
) {
  switch (config.strategy) {
    case 'momentum':
      return momentumSignal(indicators, marketData.price);
    case 'mean_reversion':
      return meanReversionSignal(indicators, marketData.price);
    case 'dca': {
      const lastBuy = state.lastDcaBuy.get(marketData.symbol) ?? 0;
      const intervalMs = 3600_000; // 1 hour default for DCA
      return dcaSignal(lastBuy, intervalMs);
    }
    case 'grid': {
      const levels = (config as any).gridLevels ?? [];
      const open = (config as any).openOrders ?? [];
      return gridSignal(marketData.price, levels, open);
    }
    case 'arbitrage': {
      const prices = (config as any).arbitragePrices ?? [];
      const thresh = (config as any).arbitrageThresholdPercent ?? 1;
      return arbitrageSignal(prices, thresh);
    }
    case 'market_making': {
      const bid = (config as any).marketMakingBid ?? marketData.bid;
      const ask = (config as any).marketMakingAsk ?? marketData.ask;
      const spreadThr = (config as any).marketMakingSpread ?? 0.5;
      return marketMakingSignal(marketData.price, bid, ask, spreadThr);
    }
    case 'event_probability': {
      const est = (config as any).eventProbabilityData?.estimated ?? 0;
      const fair = (config as any).eventProbabilityData?.fair ?? 0;
      return eventProbabilitySignal(est, fair);
    }
    default:
      return momentumSignal(indicators, marketData.price);
  }
}

// ─── Platform-Specific Configurations ─────────────────────────

export interface PlatformConfig {
  platform: TradingPlatform;
  supportedStrategies: TradingBotConfig['strategy'][];
  defaultSymbols: string[];
  minOrderSize: number;
  maxLeverage: number;
  feeTierPercent: number;
  rateLimitPerSecond: number;
  supportsShorts: boolean;
  description: string;
}

export const TRADING_PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    platform: 'coinbase',
    supportedStrategies: ['dca', 'momentum', 'mean_reversion', 'grid'],
    defaultSymbols: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
    minOrderSize: 1,
    maxLeverage: 1,
    feeTierPercent: 0.6,
    rateLimitPerSecond: 10,
    supportsShorts: false,
    description: 'Crypto spot trading — US-regulated, high liquidity, institutional grade',
  },
  {
    platform: 'binance',
    supportedStrategies: ['dca', 'momentum', 'mean_reversion', 'grid', 'arbitrage', 'market_making'],
    defaultSymbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'],
    minOrderSize: 5,
    maxLeverage: 20,
    feeTierPercent: 0.1,
    rateLimitPerSecond: 20,
    supportsShorts: true,
    description: 'Crypto spot + futures — global, highest volume, most pairs, leverage trading',
  },
  {
    platform: 'alpaca',
    supportedStrategies: ['dca', 'momentum', 'mean_reversion', 'grid'],
    defaultSymbols: ['AAPL', 'MSFT', 'NVDA', 'SPY', 'QQQ'],
    minOrderSize: 1,
    maxLeverage: 4,
    feeTierPercent: 0,
    rateLimitPerSecond: 5,
    supportsShorts: true,
    description: 'US stocks — commission-free, fractional shares, paper trading built-in',
  },
  {
    platform: 'kalshi',
    supportedStrategies: ['event_probability'],
    defaultSymbols: ['FED-RATE', 'ELECTION', 'ECONOMIC-DATA'],
    minOrderSize: 1,
    maxLeverage: 1,
    feeTierPercent: 0,
    rateLimitPerSecond: 5,
    supportsShorts: true,
    description: 'Event contracts — US-regulated, binary outcomes on real-world events',
  },
  {
    platform: 'polymarket',
    supportedStrategies: ['event_probability'],
    defaultSymbols: ['POLITICS', 'CRYPTO-EVENTS', 'SPORTS'],
    minOrderSize: 1,
    maxLeverage: 1,
    feeTierPercent: 0,
    rateLimitPerSecond: 5,
    supportsShorts: true,
    description: 'Prediction markets — decentralized, broad event coverage, crypto-native',
  },
];
