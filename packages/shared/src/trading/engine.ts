import type { TradingPlatform, MarketData, TradeSignal, Position, TradingBotConfig, TickResult } from '../index';
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

// ─── Volatility-Adjusted Position Sizing (ATR-based) ──────────

export function volatilityPositionSize(
  atrValue: number,
  currentPrice: number,
  maxPositionUsd: number,
  riskPerTradeUsd: number,
  multiplier: number = 2 // risk N × ATR per trade
): number {
  if (atrValue <= 0 || currentPrice <= 0) return 0;
  const riskPerUnit = atrValue * multiplier;
  const maxUnits = riskPerTradeUsd / riskPerUnit;
  const positionUsd = maxUnits * currentPrice;
  return Math.min(positionUsd, maxPositionUsd);
}

// ─── Trading Engine Core ──────────────────────────────────────

export interface TradingEngineState {
  config: TradingBotConfig;
  safety: SafetyContext;
  // key = symbol, value = primary timeframe history
  priceHistories: Map<string, PriceHistory>;
  // optional secondary timeframe, e.g. 15m
  secondaryHistories: Map<string, PriceHistory>;
  lastDcaBuy: Map<string, number>;
  // highest price seen per symbol (for trailing stop calculation)
  highWater: Map<string, number>;
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
    secondaryHistories: new Map(),
    lastDcaBuy: new Map(),
    highWater: new Map(),
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
  let lastResult: TickResult = {
    botId: state.safety.botId,
    timestamp: Date.now(),
    action: 'scan',
    result: 'skipped',
    details: { symbols: state.config.symbols, reason: 'no_signal' },
    durationMs: 0,
  };

  try {
    const positions = await adapter.getPositions();
    const balance = await adapter.getBalance();

    // apply daily loss limit/cooldown
    if (state.config.maxDailyLossUsd !== undefined && newState.totalPnl <= -state.config.maxDailyLossUsd) {
      return {
        result: {
          botId: state.safety.botId,
          timestamp: Date.now(),
          action: 'tick',
          result: 'skipped',
          details: { reason: 'daily_loss_limit_reached' },
          durationMs: Date.now() - startTime,
        },
        newState,
      };
    }

    for (const symbol of state.config.symbols) {
      // Fetch market data and update history
      const marketData = await adapter.fetchMarketData(symbol);
      const existingHistory = state.priceHistories.get(symbol) ?? createPriceHistory();
      const updatedHistory = pushPriceData(existingHistory, marketData);
      newState.priceHistories = new Map(newState.priceHistories);
      newState.priceHistories.set(symbol, updatedHistory);

      // if multi-timeframe mode enabled, also update secondary history
      if (state.config.multiTimeframeConfirmation) {
        const secKey = symbol + '_15m';
        const existingSec = state.secondaryHistories.get(secKey) ?? createPriceHistory();
        // in a real implementation this would pull 15‑minute candles; we'll reuse tick data
        const updatedSec = pushPriceData(existingSec, marketData);
        newState.secondaryHistories = new Map(newState.secondaryHistories);
        newState.secondaryHistories.set(secKey, updatedSec);
      }

      if (updatedHistory.prices.length < 20) continue; // Not enough data yet

      // --- position management for this symbol ------------------------------------------------
      const symbolPositions = positions.filter(p => p.symbol === symbol);
      for (const pos of symbolPositions) {
        // update high-water mark
        const prevHigh = newState.highWater.get(symbol) ?? pos.entryPrice;
        const newHigh = Math.max(prevHigh, marketData.price);
        newState.highWater.set(symbol, newHigh);

        const pnlUsd = (marketData.price - pos.entryPrice) * pos.quantity * (pos.side === 'buy' ? 1 : -1);
        const pnlPct = pnlUsd / (pos.entryPrice * pos.quantity);

        // trailing stop
        if (state.config.trailingStopPercent !== undefined) {
          const trailLevel = newHigh * (1 - state.config.trailingStopPercent);
          if (marketData.price <= trailLevel) {
            // exit position
            await adapter.placeOrder({
              platform: state.config.platform,
              symbol,
              side: pos.side === 'buy' ? 'sell' : 'buy',
              type: 'market',
              quantity: pos.quantity,
              confidence: 100,
              strategy: state.config.strategy,
              indicators: {},
              timestamp: Date.now(),
            });
            newState.totalPnl += pnlUsd;
            // trailing stop exit logged via audit entry above
          }
        }

        // stop-loss
        if (state.config.stopLossPercent !== undefined && pnlPct <= -state.config.stopLossPercent) {
          await adapter.placeOrder({
            platform: state.config.platform,
            symbol,
            side: pos.side === 'buy' ? 'sell' : 'buy',
            type: 'market',
            quantity: pos.quantity,
            confidence: 100,
            strategy: state.config.strategy,
            indicators: {},
            timestamp: Date.now(),
          });
          newState.totalPnl += pnlUsd;
          // stop-loss exit logged via audit entry above
        }

        // take-profit
        if (state.config.takeProfitPercent !== undefined && pnlPct >= state.config.takeProfitPercent) {
          await adapter.placeOrder({
            platform: state.config.platform,
            symbol,
            side: pos.side === 'buy' ? 'sell' : 'buy',
            type: 'market',
            quantity: pos.quantity,
            confidence: 100,
            strategy: state.config.strategy,
            indicators: {},
            timestamp: Date.now(),
          });
          newState.totalPnl += pnlUsd;
          // take-profit exit logged via audit entry above
        }
      }

      // Compute indicators (and optionally merge with secondary timeframe)
      let indicators = computeIndicators(
        updatedHistory.prices,
        updatedHistory.volumes,
        updatedHistory.highs,
        updatedHistory.lows
      );
      if (state.config.multiTimeframeConfirmation) {
        const sec = newState.secondaryHistories.get(symbol + '_15m');
        if (sec && sec.prices.length >= 20) {
          const secInd = computeIndicators(sec.prices, sec.volumes, sec.highs, sec.lows);
          indicators = Object.fromEntries(
            Object.keys(indicators).map((k) => [k, (((indicators as any)[k] ?? 0) + ((secInd as any)[k] ?? 0)) / 2])
          ) as any;
        }
      }

      // Generate signal based on strategy
      const signal = generateStrategySignal(state.config, indicators, marketData, state);
      if (signal.direction === 'hold') continue;

      // Check if we can open more positions
      if (signal.direction === 'buy' && positions.length >= state.config.maxOpenPositions) continue;

      // Position sizing — prefer volatility-based (ATR) when available, fall back to Kelly
      const winRate = state.totalTrades > 0 ? state.winningTrades / state.totalTrades : 0.5;
      let positionSize: number;
      if (state.config.paperTrading) {
        positionSize = state.config.maxPositionSizeUsd * 0.1;
      } else if (indicators.atr > 0 && state.config.maxDailyLossUsd) {
        const riskPerTrade = state.config.maxDailyLossUsd * 0.02; // risk 2% of daily limit per trade
        positionSize = volatilityPositionSize(indicators.atr, marketData.price, state.config.maxPositionSizeUsd, riskPerTrade);
      } else {
        positionSize = kellyPositionSize(winRate, 1.5, 1, state.config.maxPositionSizeUsd, balance.availableUsd);
      }

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
        lastResult = {
          botId: state.safety.botId,
          timestamp: Date.now(),
          action: `${signal.direction} ${symbol}`,
          result: 'denied',
          details: { reason: safetyResult.reason },
          durationMs: Date.now() - startTime,
        };
        continue;
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

        lastResult = {
          botId: state.safety.botId,
          timestamp: Date.now(),
          action: `paper_${signal.direction} ${symbol}`,
          result: 'executed',
          details: { signal: tradeSignal, paperMode: true },
          durationMs: Date.now() - startTime,
        };
        continue;
      }

      const autonomy = state.config.autonomyLevel ?? 'manual';
      if (autonomy !== 'auto') {
        lastResult = {
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
        };
        continue;
      }

      const orderResult = await adapter.placeOrder(tradeSignal);

      // validate fill
      if (!orderResult.filled) {
        logAuditEntry({
          tenantId: state.safety.tenantId,
          botId: state.safety.botId,
          platform: state.config.platform,
          action: 'order_not_filled',
          result: 'failure',
          riskLevel: 'high',
          details: { tradeSignal, orderResult },
        });
      } else {
        // if we just bought, record entry high-water; if we sold, update PnL
        if (signal.direction === 'buy') {
          const prevHigh = newState.highWater.get(symbol) ?? marketData.price;
          newState.highWater.set(symbol, prevHigh);
        } else {
          // closing position
          // approximate entry using orderResult.details?.entryPrice or marketData
          const entryPrice = (orderResult as any).entryPrice ?? marketData.price;
          const pnlUsd = (marketData.price - entryPrice) * tradeSignal.quantity * (signal.direction === 'sell' ? 1 : -1);
          newState.totalPnl += pnlUsd;
          if (pnlUsd < 0) newState.consecutiveLosses += 1;
          else {
            newState.consecutiveLosses = 0;
            newState.winningTrades += 1;
          }
        }
      }

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

      lastResult = {
        botId: state.safety.botId,
        timestamp: Date.now(),
        action: `${signal.direction} ${symbol}`,
        result: 'executed',
        details: { orderId: orderResult.orderId, signal: tradeSignal },
        durationMs: Date.now() - startTime,
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

// base signal generator without platform-specific tweaks
function baseStrategySignal(
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
      const est = config.eventProbabilityData?.estimated ?? 0;
      const fair = config.eventProbabilityData?.fair ?? 0;
      return eventProbabilitySignal(est, fair);
    }
    default:
      return momentumSignal(indicators, marketData.price);
  }
}

// dispatch to platform-specific signal generator
export function generateStrategySignal(
  config: TradingBotConfig,
  indicators: ReturnType<typeof computeIndicators>,
  marketData: MarketData,
  state: TradingEngineState
) {
  switch (config.platform) {
    case 'coinbase':
      return generateCoinbaseSignal(config, indicators, marketData, state);
    case 'binance':
      return generateBinanceSignal(config, indicators, marketData, state);
    case 'alpaca':
      return generateAlpacaSignal(config, indicators, marketData, state);
    case 'kalshi':
      return generateKalshiSignal(config, indicators, marketData, state);
    case 'polymarket':
      return generatePolymarketSignal(config, indicators, marketData, state);
    default:
      return baseStrategySignal(config, indicators, marketData, state);
  }
}

// placeholder helpers: customization hooks for each market
function generateCoinbaseSignal(
  config: TradingBotConfig,
  indicators: ReturnType<typeof computeIndicators>,
  marketData: MarketData,
  state: TradingEngineState
) {
  // Coinbase is spot-only and US-regulated; be conservative with leverage
  const signal = baseStrategySignal(config, indicators, marketData, state);
  // example tweak: require 60% confidence instead of 50
  if (signal.direction !== 'hold' && signal.confidence < 60) {
    return { direction: 'hold', confidence: signal.confidence, indicators: signal.indicators };
  }
  return signal;
}

function generateBinanceSignal(
  config: TradingBotConfig,
  indicators: ReturnType<typeof computeIndicators>,
  marketData: MarketData,
  state: TradingEngineState
) {
  // Binance offers futures and margin; apply volatility filter
  const signal = baseStrategySignal(config, indicators, marketData, state);
  // amplify momentum signals during high volume
  if (signal.direction === 'buy' && indicators.rsi > 70) {
    signal.confidence += 10;
  }
  return signal;
}

function generateAlpacaSignal(
  config: TradingBotConfig,
  indicators: ReturnType<typeof computeIndicators>,
  marketData: MarketData,
  state: TradingEngineState
) {
  // US equities; respect market hours
  const hour = new Date().getUTCHours();
  if (hour < 14 || hour > 21) {
    return { direction: 'hold', confidence: 0, indicators: {} };
  }
  return baseStrategySignal(config, indicators, marketData, state);
}

function generateKalshiSignal(
  config: TradingBotConfig,
  indicators: ReturnType<typeof computeIndicators>,
  marketData: MarketData,
  state: TradingEngineState
) {
  // prediction market; strategy is event_probability only
  return baseStrategySignal(config, indicators, marketData, state);
}

function generatePolymarketSignal(
  config: TradingBotConfig,
  indicators: ReturnType<typeof computeIndicators>,
  marketData: MarketData,
  state: TradingEngineState
) {
  // Currently stubbed; signal always hold
  return { direction: 'hold', confidence: 0, indicators: {} };
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
