import type { TradingBotConfig, TickResult } from '../index';
import { createTradingEngineState, executeTradingTick } from './engine';
import type { TradingAdapter } from './engine';

export interface Candle {
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
}

export interface BacktestResult {
  totalReturnUsd: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  sharpeRatio: number;
}

// simple adapter that feeds historical candles sequentially
// adapter mimics TradingAdapter but includes a candle queue
interface HistoricalAdapter extends TradingAdapter {
  candles: Candle[];
}

export async function backtest(
  config: TradingBotConfig,
  safety: any,
  candles: Candle[]
): Promise<BacktestResult> {
  const adapter: HistoricalAdapter = {
    platform: config.platform,
    candles,
    getPositions: async () => [],
    getBalance: async () => ({ availableUsd: 0, totalUsd: 0 }),
    placeOrder: async () => ({ orderId: 'sim', filled: true }),
    fetchMarketData: async () => candles.shift() as any,
  };

  let state = createTradingEngineState(config, safety);
  let equity = 0;

  while (candles.length > 0) {
    const { result, newState } = await executeTradingTick(state, adapter as any);
    state = newState;
    // accumulate pnl if available
    equity = state.totalPnl;
  }

  const totalTrades = state.totalTrades;
  const winRate = totalTrades > 0 ? state.winningTrades / totalTrades : 0;
  const maxDrawdown = 0; // placeholder
  const sharpeRatio = 0; // placeholder

  return {
    totalReturnUsd: equity,
    maxDrawdown,
    winRate,
    totalTrades,
    sharpeRatio,
  };
}
