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
  equityCurve: number[];
  maxDrawdownPct: number;
  profitFactor: number;
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
  const candleQueue = [...candles];
  const adapter: HistoricalAdapter = {
    platform: config.platform,
    candles: candleQueue,
    getPositions: async () => [],
    getBalance: async () => ({ availableUsd: config.maxPositionSizeUsd * 10, totalUsd: config.maxPositionSizeUsd * 10 }),
    placeOrder: async () => ({ orderId: 'sim', filled: true }),
    fetchMarketData: async () => {
      const c = candleQueue.shift();
      if (!c) return { symbol: config.symbols[0], price: 0, volume24h: 0, high24h: 0, low24h: 0, timestamp: 0, bid: 0, ask: 0, change24h: 0, change24hPercent: 0 };
      return { symbol: config.symbols[0], price: c.price, volume24h: c.volume, high24h: c.high, low24h: c.low, timestamp: c.timestamp, bid: c.price, ask: c.price, change24h: 0, change24hPercent: 0 };
    },
  };

  let state = createTradingEngineState(config, safety);
  const equityCurve: number[] = [];
  let peakEquity = 0;
  let maxDrawdown = 0;
  const returns: number[] = [];
  let prevEquity = 0;

  while (candleQueue.length > 0) {
    const { newState } = await executeTradingTick(state, adapter as any);
    state = newState;
    const equity = state.totalPnl;
    equityCurve.push(equity);

    // Track returns for Sharpe ratio
    returns.push(equity - prevEquity);
    prevEquity = equity;

    // Track peak and drawdown
    if (equity > peakEquity) peakEquity = equity;
    const drawdown = peakEquity - equity;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const totalTrades = state.totalTrades;
  const winRate = totalTrades > 0 ? state.winningTrades / totalTrades : 0;
  const maxDrawdownPct = peakEquity > 0 ? maxDrawdown / peakEquity : 0;

  // Sharpe ratio: mean(returns) / stddev(returns) * sqrt(252)
  let sharpeRatio = 0;
  if (returns.length > 1) {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    sharpeRatio = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;
  }

  // Profit factor: gross wins / gross losses
  const grossWins = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
  const grossLosses = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  return {
    totalReturnUsd: state.totalPnl,
    maxDrawdown,
    maxDrawdownPct,
    winRate,
    totalTrades,
    sharpeRatio,
    equityCurve,
    profitFactor,
  };
}
