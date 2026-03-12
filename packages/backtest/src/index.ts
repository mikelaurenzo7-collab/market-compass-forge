import {
  Bot,
  BotFamily,
  TradingEngine,
  TradingStrategy,
  TradingAdapter,
  MarketData,
  TradeSignal,
  TradingBotConfig,
  SafetyContext,
  Position,
} from '@beastbots/shared';

/**
 * The BacktestEngine class is responsible for running backtests.
 * It simulates the execution of trading strategies against historical market data.
 */
export class BacktestEngine {
  private engine: TradingEngine;
  private botConfig: TradingBotConfig;

  constructor(private strategy: TradingStrategy, bot: Bot) {
    if (bot.family !== 'trading') {
      throw new Error('Backtesting is only supported for trading bots.');
    }
    // Ensure the config is of the correct type
    this.botConfig = bot.config as TradingBotConfig;
    this.engine = new TradingEngine(strategy, this.botConfig, bot.safety);
  }

  /**
   * Runs a backtest against historical market data.
   * @param data An array of historical MarketData points (ticks).
   * @returns A summary of the backtest results.
   */
  async run(data: MarketData[]): Promise<BacktestSummary> {
    console.log(`Running backtest for bot: ${this.botConfig.platform}`);

    const results: TradeSignal[] = [];

    for (const tick of data) {
      // Create a mock adapter for each tick of historical data
      const mockAdapter: TradingAdapter = {
        platform: this.botConfig.platform,
        fetchMarketData: async (symbol: string): Promise<MarketData> => tick,
        placeOrder: async (signal: TradeSignal): Promise<{ orderId: string; filled: boolean }> => {
          // In a real backtest, we'd track simulated orders, fills, and P&L.
          // For now, we just record that an order was placed.
          console.log(`[BACKTEST] Order placed: ${signal.side} ${signal.quantity} ${signal.symbol}`);
          results.push(signal);
          return { orderId: `sim-${Date.now()}`, filled: true };
        },
        getPositions: async (): Promise<Position[]> => [], // Simulate no open positions
        getBalance: async () => ({ availableUsd: 10000, totalUsd: 10000 }), // Simulate a fixed balance
      };

      await this.engine.tick(mockAdapter);
    }

    return this.summarize(results);
  }

  /**
   * Summarizes the results of a backtest.
   * @param orders The list of trade signals that were executed.
   * @returns A summary of the results.
   */
  private summarize(orders: TradeSignal[]): BacktestSummary {
    // This is a simplified summary. A real implementation would calculate P&L, Sharpe ratio, etc.
    const pnl = orders.reduce((acc, order) => {
        // Extremely basic P&L calculation - this is not realistic
        return acc + (order.side === 'buy' ? -1 : 1) * order.quantity * (order.price ?? 0);
    }, 0);

    return {
      orders,
      pnl,
      sharpeRatio: 0, // Placeholder
    };
  }
}

/**
 * A summary of the results of a backtest session.
 */
export interface BacktestSummary {
  /**
   * The list of orders that were executed during the session.
   */
  orders: TradeSignal[];

  /**
   * The profit and loss of the session.
   */
  pnl: number;

  /**
   * The Sharpe ratio of the session.
   */
  sharpeRatio: number;
}

export * from './strategy';
export * from './social_strategy';
