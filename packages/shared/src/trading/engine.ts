
import type { TradingPlatform, MarketData, TradeSignal, Position, TradingBotConfig, TickResult } from '../index';
import type { SafetyContext } from '../safety.js';
import { runSafetyPipeline, logAuditEntry, recordError, recordSuccess, recordSpend } from '../safety.js';
import { computeIndicators } from './indicators.js';
import type { TradingStrategy, TradingStrategyInput } from './strategy.js';

// --- Interfaces ---

export interface TradingAdapter {
  platform: TradingPlatform;
  fetchMarketData(symbol: string): Promise<MarketData>;
  placeOrder(signal: TradeSignal): Promise<{ orderId: string; filled: boolean }>;
  getPositions(): Promise<Position[]>;
  getBalance(): Promise<{ availableUsd: number; totalUsd: number }>;
}

export interface PriceHistory {
  prices: number[];
  volumes: number[];
  highs: number[];
  lows: number[];
  maxLength: number;
}

export interface OpenPosition {
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  quantity: number;
  entryTimestamp: number;
  orderId: string;
}

// --- State Management ---

export interface TradingEngineState {
  config: TradingBotConfig;
  safety: SafetyContext;
  priceHistories: Map<string, PriceHistory>;
  openPositions: Map<string, OpenPosition[]>;
  consecutiveLosses: number;
  cooldownUntil: number;
  totalPnl: number;
  totalTrades: number;
  winningTrades: number;
}

// --- Trading Engine Class ---

export class TradingEngine {
  private state: TradingEngineState;

  constructor(private strategy: TradingStrategy, config: TradingBotConfig, safety: SafetyContext) {
    this.state = {
      config,
      safety,
      priceHistories: new Map(),
      openPositions: new Map(),
      consecutiveLosses: 0,
      cooldownUntil: 0,
      totalPnl: 0,
      totalTrades: 0,
      winningTrades: 0,
    };
  }

  public async tick(adapter: TradingAdapter): Promise<TickResult> {
    const startTime = Date.now();

    // Cooldown and loss limit checks
    if (this.state.cooldownUntil > Date.now()) {
      return this.createTickResult('skipped', { reason: 'cooldown' });
    }
    if (this.state.config.maxDailyLossUsd && this.state.totalPnl <= -this.state.config.maxDailyLossUsd) {
      return this.createTickResult('skipped', { reason: 'daily_loss_limit' });
    }

    for (const symbol of this.state.config.symbols) {
      try {
        const marketData = await adapter.fetchMarketData(symbol);
        this.updatePriceHistory(symbol, marketData);

        const history = this.state.priceHistories.get(symbol);
        if (!history || history.prices.length < 20) continue;

        const indicators = computeIndicators(history.prices, history.volumes, history.highs, history.lows);

        const strategyInput: TradingStrategyInput = {
          marketData,
          indicators,
          state: this.state,
        };

        const signal = await this.strategy.decide(strategyInput);

        if (signal.direction === 'hold') continue;

        // Further checks before placing order (e.g., max open positions)
        // ...

        const positionSize = this.calculatePositionSize(indicators, await adapter.getBalance());
        if (positionSize <= 0) continue;

        const tradeSignal: TradeSignal = {
          platform: this.state.config.platform,
          symbol,
          side: signal.direction,
          type: 'market',
          quantity: positionSize / marketData.price,
          confidence: signal.confidence,
          strategy: this.state.config.strategy, 
          indicators: {},
          timestamp: Date.now(),
        };

        const orderResult = await adapter.placeOrder(tradeSignal);

        this.updateStateAfterTrade(symbol, orderResult, tradeSignal, marketData);

        return this.createTickResult('executed', { orderId: orderResult.orderId, signal });

      } catch (error) {
        this.handleError(error);
        return this.createTickResult('error', { reason: error.message });
      }
    }

    return this.createTickResult('skipped', { reason: 'no_signal' });
  }

  private updatePriceHistory(symbol: string, data: MarketData): void {
    const history = this.state.priceHistories.get(symbol) ?? { prices: [], volumes: [], highs: [], lows: [], maxLength: 200 };
    history.prices.push(data.price);
    history.volumes.push(data.volume24h);
    history.highs.push(data.high24h);
    history.lows.push(data.low24h);
    // more logic to slice arrays to maxLength
    this.state.priceHistories.set(symbol, history);
  }

  private calculatePositionSize(indicators: any, balance: { availableUsd: number }): number {
    // Simplified for now. In a real scenario, this would be more complex.
    return this.state.config.maxPositionSizeUsd * 0.1;
  }

  private updateStateAfterTrade(symbol: string, orderResult: { filled: boolean, orderId: string }, tradeSignal: TradeSignal, marketData: MarketData): void {
    if (orderResult.filled) {
        // ... logic to update open positions, P&L, etc.
    }
  }

  private handleError(error: any): void {
    console.error('Trading tick failed:', error);
    this.state.safety = {
      ...this.state.safety,
      circuitBreaker: recordError(this.state.safety.circuitBreaker),
    };
  }

  private createTickResult(result: TickResult['result'], details: object): TickResult {
    return {
      botId: this.state.safety.botId,
      timestamp: Date.now(),
      action: 'trade',
      result,
      details: { ...details, durationMs: Date.now() - this.state.safety.botId.length }, // Placeholder for duration
      durationMs: 0,
    };
  }
}
