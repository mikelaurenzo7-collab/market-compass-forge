import type { TradingBotConfig, TickResult, SafetyContext } from '../index';
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
  sortinoRatio: number;
  equityCurve: number[];
  maxDrawdownPct: number;
  profitFactor: number;
  totalCommission: number;
}

/** Backtest configuration for realistic simulation */
export interface BacktestOptions {
  /** Slippage as a fraction of price (e.g. 0.001 = 0.1%) */
  slippagePct?: number;
  /** Commission per trade as a fraction (e.g. 0.001 = 0.1%) */
  commissionPct?: number;
}

// simple adapter that feeds historical candles sequentially
// adapter mimics TradingAdapter but includes a candle queue
interface HistoricalAdapter extends TradingAdapter {
  candles: Candle[];
}

export async function backtest(
  config: TradingBotConfig,
  safety: SafetyContext,
  candles: Candle[],
  options: BacktestOptions = {}
): Promise<BacktestResult> {
  const slippagePct = options.slippagePct ?? 0.001; // default 0.1%
  const commissionPct = options.commissionPct ?? 0.001; // default 0.1%
  let totalCommission = 0;
  const candleQueue = [...candles];

  const adapter: HistoricalAdapter = {
    platform: config.platform,
    candles: candleQueue,
    getPositions: async () => [],
    getBalance: async () => ({ availableUsd: config.maxPositionSizeUsd * 10, totalUsd: config.maxPositionSizeUsd * 10 }),
    placeOrder: async (signal) => {
      // Simulate slippage: buy fills higher, sell fills lower
      const slipDir = signal.side === 'buy' ? 1 : -1;
      const fillPrice = (candleQueue[0]?.price ?? 0) * (1 + slipDir * slippagePct);
      // Deduct commission
      const tradeValue = fillPrice * signal.quantity;
      totalCommission += tradeValue * commissionPct;
      return { orderId: 'sim', filled: true };
    },
    fetchMarketData: async () => {
      const c = candleQueue.shift();
      if (!c) return { symbol: config.symbols[0], price: 0, volume24h: 0, high24h: 0, low24h: 0, timestamp: 0, bid: 0, ask: 0, change24h: 0, change24hPercent: 0 };
      // Simulate bid-ask spread from slippage
      const halfSpread = c.price * slippagePct;
      return { symbol: config.symbols[0], price: c.price, volume24h: c.volume, high24h: c.high, low24h: c.low, timestamp: c.timestamp, bid: c.price - halfSpread, ask: c.price + halfSpread, change24h: 0, change24hPercent: 0 };
    },
  };

  let state = createTradingEngineState(config, safety);
  const equityCurve: number[] = [];
  let peakEquity = 0;
  let maxDrawdown = 0;
  const returns: number[] = [];
  let prevEquity = 0;

  while (candleQueue.length > 0) {
    const { newState } = await executeTradingTick(state, adapter);
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
  let sortinoRatio = 0;
  if (returns.length > 1) {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    sharpeRatio = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;

    // Sortino ratio: penalizes only downside deviation
    const downsideReturns = returns.filter(r => r < 0);
    if (downsideReturns.length > 0) {
      const downsideVariance = downsideReturns.reduce((sum, r) => sum + r ** 2, 0) / downsideReturns.length;
      const downsideDev = Math.sqrt(downsideVariance);
      sortinoRatio = downsideDev > 0 ? (mean / downsideDev) * Math.sqrt(252) : 0;
    } else {
      sortinoRatio = sharpeRatio; // no downside = treat as Sharpe
    }
  }

  // Profit factor: gross wins / gross losses (adjusted for commissions)
  const grossWins = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
  const grossLosses = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  return {
    totalReturnUsd: state.totalPnl - totalCommission,
    maxDrawdown,
    maxDrawdownPct,
    winRate,
    totalTrades,
    sharpeRatio,
    sortinoRatio,
    equityCurve,
    profitFactor,
    totalCommission,
  };
}
