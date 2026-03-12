import type { TradingPlatform, MarketData, TradeSignal, Position, TradingBotConfig, TickResult } from '../index';
import type { SafetyContext } from '../safety.js';
import { runSafetyPipeline, logAuditEntry, recordError, recordSuccess, recordSpend } from '../safety.js';
import { promptLLM, promptWithTemplate } from '../llm.js';
import { TRADING_INSIGHT_TEMPLATE } from '../prompts.js';
import { computeIndicators, momentumSignal, meanReversionSignal, dcaSignal, gridSignal, arbitrageSignal, marketMakingSignal, eventProbabilitySignal } from './indicators.js';
import { gatherMarketContext, marketSentimentModifier, type MarketContext } from '../market-intelligence.js';
import { forecastTimeSeries } from '../vertex-ai.js';
import { dispatchAlert, getTwilioConfig, type AlertRecipient } from '../twilio-alerts.js';

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

// ─── Open Position Tracking ───────────────────────────────────

export interface OpenPosition {
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  quantity: number;
  entryTimestamp: number;
  orderId: string;
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
  // internal position tracker — source of truth for entry prices & P&L
  openPositions: Map<string, OpenPosition[]>;
  consecutiveLosses: number;
  cooldownUntil: number;
  totalPnl: number;
  totalTrades: number;
  winningTrades: number;
  // enrichment: external market context (refreshed periodically)
  marketContext?: MarketContext | null;
  lastMarketContextFetch: number;
  // alert recipients for Twilio/WhatsApp notifications
  alertRecipients: AlertRecipient[];
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
    openPositions: new Map(),
    consecutiveLosses: 0,
    cooldownUntil: 0,
    totalPnl: 0,
    totalTrades: 0,
    winningTrades: 0,
    marketContext: null,
    lastMarketContextFetch: 0,
    alertRecipients: [],
  };
}

/** Close a position tracked in engine state and update P&L / win-loss stats. */
export function closeTrackedPosition(
  newState: TradingEngineState,
  symbol: string,
  exitPrice: number,
  quantity: number,
): number {
  const tracked = newState.openPositions.get(symbol) ?? [];
  let remaining = quantity;
  let realizedPnl = 0;

  const survivors: OpenPosition[] = [];
  for (const pos of tracked) {
    if (remaining <= 0) { survivors.push(pos); continue; }
    const closable = Math.min(pos.quantity, remaining);
    const pnl = (exitPrice - pos.entryPrice) * closable * (pos.side === 'buy' ? 1 : -1);
    realizedPnl += pnl;
    remaining -= closable;
    const leftover = pos.quantity - closable;
    if (leftover > 0) {
      survivors.push({ ...pos, quantity: leftover });
    }
  }

  newState.openPositions = new Map(newState.openPositions);
  if (survivors.length > 0) {
    newState.openPositions.set(symbol, survivors);
  } else {
    newState.openPositions.delete(symbol);
  }

  newState.totalPnl += realizedPnl;
  newState.totalTrades += 1;
  if (realizedPnl >= 0) {
    newState.winningTrades += 1;
    newState.consecutiveLosses = 0;
  } else {
    newState.consecutiveLosses += 1;
    // apply cooldown after configurable consecutive losses (default 3)
    if (newState.config.cooldownAfterLossMs > 0 && newState.consecutiveLosses >= 3) {
      newState.cooldownUntil = Date.now() + newState.config.cooldownAfterLossMs;
    }
  }

  return realizedPnl;
}

function trackOpenedPosition(
  newState: TradingEngineState,
  symbol: string,
  entryPrice: number,
  quantity: number,
  orderId: string,
): void {
  const existing = newState.openPositions.get(symbol) ?? [];
  newState.openPositions = new Map(newState.openPositions);
  newState.openPositions.set(symbol, [...existing, {
    symbol,
    side: 'buy' as const,
    entryPrice,
    quantity,
    entryTimestamp: Date.now(),
    orderId,
  }]);
  const prevHigh = newState.highWater.get(symbol) ?? entryPrice;
  newState.highWater.set(symbol, prevHigh);
  if (newState.config.strategy === 'dca') {
    newState.lastDcaBuy = new Map(newState.lastDcaBuy);
    newState.lastDcaBuy.set(symbol, Date.now());
  }
}

function countManagedOpenPositions(
  trackedPositions: Map<string, OpenPosition[]>,
  adapterPositions: Position[],
): number {
  const trackedCount = Array.from(trackedPositions.values()).reduce((sum, positions) => sum + positions.length, 0);
  return trackedCount > 0 ? trackedCount : adapterPositions.length;
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

    // consecutive loss cooldown — pause trading until cooldown expires
    if (newState.cooldownUntil > 0 && Date.now() < newState.cooldownUntil) {
      return {
        result: {
          botId: state.safety.botId,
          timestamp: Date.now(),
          action: 'tick',
          result: 'skipped',
          details: { reason: 'consecutive_loss_cooldown', cooldownUntil: newState.cooldownUntil },
          durationMs: Date.now() - startTime,
        },
        newState,
      };
    }
    // reset cooldown if it has expired
    if (newState.cooldownUntil > 0 && Date.now() >= newState.cooldownUntil) {
      newState.cooldownUntil = 0;
    }

    // ─── Market Intelligence Enrichment ───────────
    // Refresh external market context every 15 minutes (non-blocking)
    const MARKET_CTX_INTERVAL = 15 * 60 * 1000;
    if (Date.now() - newState.lastMarketContextFetch > MARKET_CTX_INTERVAL) {
      try {
        const ctx = await gatherMarketContext({
          ticker: state.config.symbols[0],
          keywords: state.config.symbols,
        });
        newState.marketContext = ctx;
        newState.lastMarketContextFetch = Date.now();
        logAuditEntry({
          tenantId: state.safety.tenantId,
          botId: state.safety.botId,
          platform: state.config.platform,
          action: 'market_context_refresh',
          result: 'success',
          riskLevel: 'low',
          details: {
            fearGreed: ctx.fearGreed?.value,
            newsSentiment: ctx.newsSentiment?.overallSentiment,
            trendingCoins: ctx.trendingCoins?.length,
          },
        });
      } catch {
        // Market intelligence is enrichment only — never blocks trading
      }
    }

    // ─── Vertex AI Price Forecasting ──────────────
    // Run forecasting once per context refresh cycle for the primary symbol
    let priceForecast: { predictions: number[]; confidence: number } | null = null;
    if (state.config.symbols.length > 0) {
      const primaryHistory = newState.priceHistories.get(state.config.symbols[0]);
      if (primaryHistory && primaryHistory.prices.length >= 30) {
        try {
          const priceValues: Array<[number, number]> = primaryHistory.prices.slice(-60).map((p, i) => [Date.now() - (59 - i) * 60000, p]);
          const forecast = await forecastTimeSeries(
            priceValues,
            5,     // predict 5 steps ahead
            60000, // assume 1-minute candles
          );
          if (forecast) {
            priceForecast = { predictions: forecast.predictions.map(p => p.value), confidence: forecast.confidence };
          }
        } catch {
          // Forecasting is enrichment — never blocks
        }
      }
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
      // Prefer engine-tracked positions (accurate entry price) over adapter positions
      const trackedPositions = newState.openPositions.get(symbol) ?? [];
      const adapterPositions = positions.filter(p => p.symbol === symbol);
      const symbolPositions = trackedPositions.length > 0
        ? trackedPositions.map(tp => ({
            platform: state.config.platform,
            symbol: tp.symbol,
            side: tp.side,
            entryPrice: tp.entryPrice,
            currentPrice: marketData.price,
            quantity: tp.quantity,
            unrealizedPnl: (marketData.price - tp.entryPrice) * tp.quantity * (tp.side === 'buy' ? 1 : -1),
            openedAt: tp.entryTimestamp,
          } satisfies Position))
        : adapterPositions;

      for (const pos of symbolPositions) {
        // update high-water mark
        const prevHigh = newState.highWater.get(symbol) ?? pos.entryPrice;
        const newHigh = Math.max(prevHigh, marketData.price);
        newState.highWater.set(symbol, newHigh);

        const pnlPct = pos.entryPrice > 0
          ? ((marketData.price - pos.entryPrice) * (pos.side === 'buy' ? 1 : -1)) / pos.entryPrice
          : 0;

        // trailing stop
        if (state.config.trailingStopPercent !== undefined) {
          const trailLevel = newHigh * (1 - state.config.trailingStopPercent);
          if (marketData.price <= trailLevel) {
            const exitResult = await adapter.placeOrder({
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
            if (exitResult.filled) {
              closeTrackedPosition(newState, symbol, marketData.price, pos.quantity);
            }
          }
        }

        // stop-loss
        if (state.config.stopLossPercent !== undefined && pnlPct <= -state.config.stopLossPercent) {
          const exitResult = await adapter.placeOrder({
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
          if (exitResult.filled) {
            closeTrackedPosition(newState, symbol, marketData.price, pos.quantity);
          }
        }

        // take-profit
        if (state.config.takeProfitPercent !== undefined && pnlPct >= state.config.takeProfitPercent) {
          const exitResult = await adapter.placeOrder({
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
          if (exitResult.filled) {
            closeTrackedPosition(newState, symbol, marketData.price, pos.quantity);
          }
        }
      }

      // Compute indicators (and optionally confirm with secondary timeframe)
      let indicators = computeIndicators(
        updatedHistory.prices,
        updatedHistory.volumes,
        updatedHistory.highs,
        updatedHistory.lows
      );

      // Multi-timeframe confirmation: require same direction on secondary (15m) timeframe
      let secondarySignal: ReturnType<typeof computeIndicators> | null = null;
      if (state.config.multiTimeframeConfirmation) {
        const sec = newState.secondaryHistories.get(symbol + '_15m');
        if (sec && sec.prices.length >= 20) {
          secondarySignal = computeIndicators(sec.prices, sec.volumes, sec.highs, sec.lows);
        }
      }

      // Generate signal based on strategy
      const signal = generateStrategySignal(state.config, indicators, marketData, state);

      // ─── Market Intelligence Confidence Modifier ──
      // Adjust signal confidence based on fear/greed + news sentiment
      if (newState.marketContext && signal.direction !== 'hold') {
        const modifier = marketSentimentModifier(newState.marketContext);
        signal.confidence = Math.max(0, Math.min(100, signal.confidence + modifier));
        // If forecast disagrees with direction, reduce confidence
        if (priceForecast && priceForecast.predictions.length > 0) {
          const forecastTrend = priceForecast.predictions[priceForecast.predictions.length - 1] - marketData.price;
          const forecastAgrees = (signal.direction === 'buy' && forecastTrend > 0) || (signal.direction === 'sell' && forecastTrend < 0);
          if (!forecastAgrees) {
            signal.confidence = Math.max(0, signal.confidence - 10);
          } else {
            signal.confidence = Math.min(100, signal.confidence + 5);
          }
        }
      }

      if (signal.direction === 'hold') continue;

      // Multi-timeframe gate: secondary timeframe must agree on direction
      if (secondarySignal) {
        const secSignal = generateStrategySignal(state.config, secondarySignal, marketData, state);
        if (secSignal.direction !== signal.direction) continue; // timeframes disagree — skip
      }

      // Check if we can open more positions
      if (signal.direction === 'buy' && countManagedOpenPositions(newState.openPositions, positions) >= state.config.maxOpenPositions) continue;

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

      // Optionally ask LLM for structured insight before running safety
      if (state.config.useLLM) {
        try {
          const winRate = state.totalTrades > 0 ? state.winningTrades / state.totalTrades : 0.5;
          const { result: insight, raw } = await promptWithTemplate(
            TRADING_INSIGHT_TEMPLATE,
            {
              symbol,
              platform: state.config.platform,
              price: marketData.price,
              change24h: marketData.change24hPercent / 100,
              volume24h: marketData.volume24h,
              direction: signal.direction,
              confidence: signal.confidence,
              indicators: signal.indicators as Record<string, number | undefined>,
              strategy: state.config.strategy,
              positionCount: positions.length,
              winRate,
            },
          );
          logAuditEntry({
            tenantId: state.safety.tenantId,
            botId: state.safety.botId,
            platform: state.config.platform,
            action: 'llm_trading_insight',
            result: 'success',
            riskLevel: 'low',
            details: { insight, raw },
          });
        } catch (err) {
          console.warn('LLM insight error', err);
        }
      }

      // Run safety pipeline
      const safetyResult = runSafetyPipeline(
        state.safety,
        `${signal.direction} ${symbol}`,
        estimatedCost,
        signal.confidence > 70 ? 'low' : 'medium',
        {
          bot: { totalTicks: updatedHistory.prices.length },
          config: state.config as unknown as Record<string, unknown>,
          metrics: { totalPnlUsd: newState.totalPnl },
        },
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
        if (signal.direction === 'buy') {
          trackOpenedPosition(newState, symbol, marketData.price, tradeSignal.quantity, `paper-${Date.now()}`);
        } else {
          closeTrackedPosition(newState, symbol, marketData.price, tradeSignal.quantity);
        }

        newState.safety = {
          ...newState.safety,
          budget: recordSpend(newState.safety.budget, estimatedCost),
          circuitBreaker: recordSuccess(newState.safety.circuitBreaker),
        };

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
        if (signal.direction === 'buy') {
          trackOpenedPosition(newState, symbol, marketData.price, tradeSignal.quantity, orderResult.orderId);
        } else {
          // Close tracked position (FIFO) — updates P&L, totalTrades, winningTrades, consecutiveLosses
          closeTrackedPosition(newState, symbol, marketData.price, tradeSignal.quantity);
        }
      }

      // Update budget
      newState.safety = {
        ...newState.safety,
        budget: recordSpend(newState.safety.budget, estimatedCost),
        circuitBreaker: recordSuccess(newState.safety.circuitBreaker),
      };

      // ─── Twilio Trade Alert ─────────────────────
      if (newState.alertRecipients.length > 0) {
        const twilioConfig = getTwilioConfig();
        if (twilioConfig) {
          dispatchAlert(
            twilioConfig,
            newState.alertRecipients,
            'trade_executed',
            `${signal.direction.toUpperCase()} ${symbol} — $${positionSize.toFixed(2)} at $${marketData.price.toFixed(2)} (confidence: ${signal.confidence}%)`,
            { botId: state.safety.botId },
          ).catch(() => { /* alert delivery is best-effort */ });
        }
      }

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

    // Return the last meaningful result, or no_signal if nothing happened
    return {
      result: lastResult ?? {
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

    // ─── Twilio Circuit-Breaker Alert ─────────────
    if (newState.alertRecipients.length > 0) {
      const twilioConfig = getTwilioConfig();
      if (twilioConfig) {
        dispatchAlert(
          twilioConfig,
          newState.alertRecipients,
          'circuit_breaker_tripped',
          `Trading engine error: ${error instanceof Error ? error.message : String(error)}`,
          { botId: state.safety.botId },
        ).catch(() => {});
      }
    }

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

// ─── Cross-Exchange Arbitrage ─────────────────────────────────

/** Fetch prices from multiple exchanges for the same symbol, detect spread,
 *  and execute simultaneous buy (cheap) + sell (expensive) if profitable. */
export async function executeArbitrageTick(
  state: TradingEngineState,
  adapters: Map<string, TradingAdapter>,
  symbol: string,
): Promise<{ result: TickResult; newState: TradingEngineState }> {
  const startTime = Date.now();
  let newState = { ...state };

  const threshold = state.config.arbitrageThresholdPercent ?? 1;

  // Fetch prices from all provided exchanges concurrently
  const priceEntries: { platform: string; adapter: TradingAdapter; marketData: MarketData }[] = [];
  const fetchResults = await Promise.allSettled(
    Array.from(adapters.entries()).map(async ([platform, adapter]) => {
      const md = await adapter.fetchMarketData(symbol);
      return { platform, adapter, marketData: md };
    }),
  );

  for (const r of fetchResults) {
    if (r.status === 'fulfilled') priceEntries.push(r.value);
  }

  if (priceEntries.length < 2) {
    return {
      result: {
        botId: state.safety.botId,
        timestamp: Date.now(),
        action: 'arbitrage_scan',
        result: 'skipped',
        details: { reason: 'insufficient_exchanges', available: priceEntries.length },
        durationMs: Date.now() - startTime,
      },
      newState,
    };
  }

  // Find cheapest and most expensive exchange
  priceEntries.sort((a, b) => a.marketData.price - b.marketData.price);
  const cheapest = priceEntries[0];
  const expensive = priceEntries[priceEntries.length - 1];

  const spread = ((expensive.marketData.price - cheapest.marketData.price) / cheapest.marketData.price) * 100;

  if (spread < threshold) {
    return {
      result: {
        botId: state.safety.botId,
        timestamp: Date.now(),
        action: 'arbitrage_scan',
        result: 'skipped',
        details: {
          reason: 'spread_below_threshold',
          spread: spread.toFixed(4),
          threshold,
          cheapest: { platform: cheapest.platform, price: cheapest.marketData.price },
          expensive: { platform: expensive.platform, price: expensive.marketData.price },
        },
        durationMs: Date.now() - startTime,
      },
      newState,
    };
  }

  // Calculate position size
  const positionSizeUsd = Math.min(
    state.config.maxPositionSizeUsd,
    state.config.maxDailyLossUsd * 0.05, // risk max 5% of daily limit per arb
  );
  const quantity = positionSizeUsd / cheapest.marketData.price;
  if (quantity <= 0) {
    return {
      result: {
        botId: state.safety.botId,
        timestamp: Date.now(),
        action: 'arbitrage_scan',
        result: 'skipped',
        details: { reason: 'zero_quantity' },
        durationMs: Date.now() - startTime,
      },
      newState,
    };
  }

  // Execute both legs concurrently
  const makeSignal = (side: 'buy' | 'sell', price: number): TradeSignal => ({
    platform: state.config.platform,
    symbol,
    side,
    type: 'market',
    quantity,
    confidence: Math.min(spread * 10, 100),
    strategy: 'arbitrage',
    indicators: { spread, buyPrice: cheapest.marketData.price, sellPrice: expensive.marketData.price },
    timestamp: Date.now(),
  });

  const [buyResult, sellResult] = await Promise.allSettled([
    cheapest.adapter.placeOrder(makeSignal('buy', cheapest.marketData.price)),
    expensive.adapter.placeOrder(makeSignal('sell', expensive.marketData.price)),
  ]);

  const buyFilled = buyResult.status === 'fulfilled' && buyResult.value.filled;
  const sellFilled = sellResult.status === 'fulfilled' && sellResult.value.filled;

  // If only one leg fills, record as partial (needs manual attention)
  const bothFilled = buyFilled && sellFilled;
  const netPnl = bothFilled
    ? (expensive.marketData.price - cheapest.marketData.price) * quantity
    : 0;

  if (bothFilled) {
    newState.totalPnl += netPnl;
    newState.totalTrades += 1;
    if (netPnl >= 0) {
      newState.winningTrades += 1;
      newState.consecutiveLosses = 0;
    } else {
      newState.consecutiveLosses += 1;
    }
  }

  const riskLevel = bothFilled ? 'low' : (buyFilled || sellFilled ? 'high' : 'medium');

  logAuditEntry({
    tenantId: state.safety.tenantId,
    botId: state.safety.botId,
    platform: state.config.platform,
    action: 'arbitrage_execution',
    result: bothFilled ? 'success' : 'failure',
    riskLevel,
    details: {
      spread: spread.toFixed(4),
      buyPlatform: cheapest.platform,
      sellPlatform: expensive.platform,
      buyPrice: cheapest.marketData.price,
      sellPrice: expensive.marketData.price,
      quantity,
      buyFilled,
      sellFilled,
      netPnl: bothFilled ? netPnl : undefined,
      partial: (buyFilled || sellFilled) && !bothFilled,
    },
  });

  return {
    result: {
      botId: state.safety.botId,
      timestamp: Date.now(),
      action: `arbitrage ${symbol}`,
      result: bothFilled ? 'executed' : 'error',
      details: {
        buyPlatform: cheapest.platform,
        sellPlatform: expensive.platform,
        spread: spread.toFixed(4),
        netPnl: bothFilled ? netPnl : undefined,
        buyFilled,
        sellFilled,
      },
      durationMs: Date.now() - startTime,
    },
    newState,
  };
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
      const levels = config.gridLevels ?? [];
      const open = config.openOrders ?? [];
      return gridSignal(marketData.price, levels, open);
    }
    case 'arbitrage': {
      const prices = config.arbitragePrices ?? [];
      const thresh = config.arbitrageThresholdPercent ?? 1;
      return arbitrageSignal(prices, thresh);
    }
    case 'market_making': {
      const bid = config.marketMakingBid ?? marketData.bid;
      const ask = config.marketMakingAsk ?? marketData.ask;
      const spreadThr = config.marketMakingSpread ?? 0.5;
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
    return { ...signal, confidence: Math.min(signal.confidence + 10, 100) };
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
  // Polymarket is an on-chain prediction market — same event probability logic as Kalshi
  // Use market price as the current probability, compare to user's estimated value
  if (config.strategy === 'event_probability' && config.eventProbabilityData) {
    const estimated = config.eventProbabilityData.estimated ?? config.eventProbabilityData.currentProbability;
    const fair = config.eventProbabilityData.fair ?? marketData.price;
    return eventProbabilitySignal(estimated, fair);
  }
  // For non-event strategies on Polymarket, use base signal with conservative thresholds
  const signal = baseStrategySignal(config, indicators, marketData, state);
  // Require higher confidence for on-chain trades (gas costs, slippage)
  if (signal.direction !== 'hold' && signal.confidence < 65) {
    return { direction: 'hold' as const, confidence: signal.confidence, indicators: signal.indicators };
  }
  return signal;
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
