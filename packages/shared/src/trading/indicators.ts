import type { MarketData } from '../index.js';

// ─── Technical Indicators ──────────────────────────────────────

export function sma(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

export function ema(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length === 1) return prices[0];
  const k = 2 / (period + 1);
  let result = prices[0];
  for (let i = 1; i < prices.length; i++) {
    result = prices[i] * k + result * (1 - k);
  }
  return result;
}

export function rsi(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  const recent = changes.slice(-period);
  let avgGain = 0;
  let avgLoss = 0;
  for (const change of recent) {
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(prices: number[], fast: number = 12, slow: number = 26, signal: number = 9): {
  macd: number;
  signal: number;
  histogram: number;
} {
  const emaFast = ema(prices, fast);
  const emaSlow = ema(prices, slow);
  const macdLine = emaFast - emaSlow;
  // Signal line is approximated from available data
  const signalLine = ema([...prices.slice(-signal), macdLine], signal);
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine,
  };
}

export function bollingerBands(prices: number[], period: number = 20, stdDevMultiplier: number = 2): {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
} {
  const middle = sma(prices, period);
  const slice = prices.slice(-period);
  const variance = slice.reduce((sum, p) => sum + (p - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  const upper = middle + stdDev * stdDevMultiplier;
  const lower = middle - stdDev * stdDevMultiplier;
  return {
    upper,
    middle,
    lower,
    bandwidth: (upper - lower) / middle,
  };
}

export function atr(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < 2) return 0;
  const trueRanges: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }
  return sma(trueRanges, Math.min(period, trueRanges.length));
}

export function vwap(prices: number[], volumes: number[]): number {
  if (prices.length === 0) return 0;
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  for (let i = 0; i < prices.length; i++) {
    cumulativeTPV += prices[i] * (volumes[i] ?? 0);
    cumulativeVolume += volumes[i] ?? 0;
  }
  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : prices[prices.length - 1];
}

export function obv(prices: number[], volumes: number[]): number {
  if (prices.length < 2) return 0;
  let result = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) result += volumes[i] ?? 0;
    else if (prices[i] < prices[i - 1]) result -= volumes[i] ?? 0;
  }
  return result;
}

// ─── Signal Generators ─────────────────────────────────────────

export interface IndicatorValues {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  ema12: number;
  ema26: number;
  sma20: number;
  sma50: number;
  bollingerBands: { upper: number; middle: number; lower: number; bandwidth: number };
  atr: number;
  vwap: number;
}

export function computeIndicators(
  prices: number[],
  volumes: number[],
  highs: number[],
  lows: number[]
): IndicatorValues {
  return {
    rsi: rsi(prices),
    macd: macd(prices),
    ema12: ema(prices, 12),
    ema26: ema(prices, 26),
    sma20: sma(prices, 20),
    sma50: sma(prices, 50),
    bollingerBands: bollingerBands(prices),
    atr: atr(highs, lows, prices),
    vwap: vwap(prices, volumes),
  };
}

export type SignalDirection = 'buy' | 'sell' | 'hold';

export interface SignalOutput {
  direction: SignalDirection;
  confidence: number;
  indicators: Record<string, number>;
  reason: string;
}

// ─── Momentum Signal ───────────────────────────────────────────

export function momentumSignal(indicators: IndicatorValues, currentPrice: number): SignalOutput {
  let score = 0;
  const reasons: string[] = [];

  // EMA crossover: fast > slow = bullish
  if (indicators.ema12 > indicators.ema26) {
    score += 25;
    reasons.push('EMA12 > EMA26 (bullish crossover)');
  } else {
    score -= 25;
    reasons.push('EMA12 < EMA26 (bearish crossover)');
  }

  // RSI: oversold = buy, overbought = sell
  if (indicators.rsi < 30) {
    score += 30;
    reasons.push(`RSI ${indicators.rsi.toFixed(1)} (oversold)`);
  } else if (indicators.rsi > 70) {
    score -= 30;
    reasons.push(`RSI ${indicators.rsi.toFixed(1)} (overbought)`);
  }

  // MACD histogram: positive = bullish momentum
  if (indicators.macd.histogram > 0) {
    score += 20;
    reasons.push('MACD histogram positive');
  } else {
    score -= 20;
    reasons.push('MACD histogram negative');
  }

  // Price above VWAP = bullish
  if (currentPrice > indicators.vwap) {
    score += 15;
    reasons.push('Price above VWAP');
  } else {
    score -= 15;
    reasons.push('Price below VWAP');
  }

  // Price relative to SMA50
  if (currentPrice > indicators.sma50) {
    score += 10;
    reasons.push('Price above SMA50');
  } else {
    score -= 10;
    reasons.push('Price below SMA50');
  }

  const confidence = Math.min(Math.abs(score), 100);
  const direction: SignalDirection = score > 20 ? 'buy' : score < -20 ? 'sell' : 'hold';

  return {
    direction,
    confidence,
    indicators: {
      rsi: indicators.rsi,
      ema12: indicators.ema12,
      ema26: indicators.ema26,
      macdHistogram: indicators.macd.histogram,
      vwap: indicators.vwap,
    },
    reason: reasons.join('; '),
  };
}

// ─── Mean Reversion Signal ─────────────────────────────────────

export function meanReversionSignal(indicators: IndicatorValues, currentPrice: number): SignalOutput {
  const reasons: string[] = [];
  let score = 0;

  // Bollinger Band position
  const bb = indicators.bollingerBands;
  const bbPosition = (currentPrice - bb.lower) / (bb.upper - bb.lower);

  if (bbPosition < 0.1) {
    score += 40;
    reasons.push(`Price near lower Bollinger Band (${(bbPosition * 100).toFixed(1)}%)`);
  } else if (bbPosition > 0.9) {
    score -= 40;
    reasons.push(`Price near upper Bollinger Band (${(bbPosition * 100).toFixed(1)}%)`);
  }

  // RSI extremes for mean reversion
  if (indicators.rsi < 25) {
    score += 35;
    reasons.push(`RSI extremely oversold (${indicators.rsi.toFixed(1)})`);
  } else if (indicators.rsi > 75) {
    score -= 35;
    reasons.push(`RSI extremely overbought (${indicators.rsi.toFixed(1)})`);
  }

  // Distance from SMA20 (mean)
  const distanceFromMean = (currentPrice - indicators.sma20) / indicators.sma20;
  if (distanceFromMean < -0.03) {
    score += 25;
    reasons.push(`Price ${(distanceFromMean * 100).toFixed(1)}% below SMA20`);
  } else if (distanceFromMean > 0.03) {
    score -= 25;
    reasons.push(`Price ${(distanceFromMean * 100).toFixed(1)}% above SMA20`);
  }

  const confidence = Math.min(Math.abs(score), 100);
  const direction: SignalDirection = score > 20 ? 'buy' : score < -20 ? 'sell' : 'hold';

  return {
    direction,
    confidence,
    indicators: {
      bbPosition,
      rsi: indicators.rsi,
      distanceFromMean,
      sma20: indicators.sma20,
    },
    reason: reasons.join('; '),
  };
}

// ─── DCA Signal (always buy on schedule) ───────────────────────

export function dcaSignal(lastBuyTimestamp: number, intervalMs: number): SignalOutput {
  const elapsed = Date.now() - lastBuyTimestamp;
  const shouldBuy = elapsed >= intervalMs;

  return {
    direction: shouldBuy ? 'buy' : 'hold',
    confidence: shouldBuy ? 80 : 0,
    indicators: { elapsedMs: elapsed, intervalMs },
    reason: shouldBuy
      ? `DCA interval reached (${(elapsed / 1000 / 60).toFixed(0)} min elapsed)`
      : `DCA interval not yet reached (${((intervalMs - elapsed) / 1000 / 60).toFixed(0)} min remaining)`,
  };
}

// ─── Grid Trading Signal ───────────────────────────────────────

export function gridSignal(
  currentPrice: number,
  gridLevels: number[],
  openOrders: { price: number; side: 'buy' | 'sell' }[]
): SignalOutput {
  const openPrices = new Set(openOrders.map((o) => o.price));
  let closestBuy: number | undefined;
  let closestSell: number | undefined;

  for (const level of gridLevels) {
    if (openPrices.has(level)) continue;
    if (level < currentPrice && (!closestBuy || level > closestBuy)) {
      closestBuy = level;
    }
    if (level > currentPrice && (!closestSell || level < closestSell)) {
      closestSell = level;
    }
  }

  if (closestBuy && currentPrice - closestBuy < (closestSell ? closestSell - currentPrice : Infinity)) {
    return {
      direction: 'buy',
      confidence: 70,
      indicators: { gridLevel: closestBuy, currentPrice },
      reason: `Grid buy level at $${closestBuy.toFixed(2)} is closest`,
    };
  }

  if (closestSell) {
    return {
      direction: 'sell',
      confidence: 70,
      indicators: { gridLevel: closestSell, currentPrice },
      reason: `Grid sell level at $${closestSell.toFixed(2)} is closest`,
    };
  }

  return {
    direction: 'hold',
    confidence: 0,
    indicators: { currentPrice },
    reason: 'All grid levels have open orders',
  };
}

// ─── Arbitrage Signal ───────────────────────────────────────────

export function arbitrageSignal(
  prices: number[],
  thresholdPercent: number = 1
): SignalOutput {
  if (prices.length < 2) {
    return { direction: 'hold', confidence: 0, indicators: {}, reason: 'not enough markets' };
  }
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const spread = ((max - min) / min) * 100;
  if (spread > thresholdPercent) {
    return {
      direction: 'buy',
      confidence: Math.min(spread, 100),
      indicators: { max, min, spread },
      reason: `spread ${spread.toFixed(2)}% exceeds threshold`,
    };
  }
  return { direction: 'hold', confidence: 0, indicators: { max, min, spread }, reason: 'no arbitrage opportunity' };
}

// ─── Market Making Signal ────────────────────────────────────────

export function marketMakingSignal(
  currentPrice: number,
  bid: number,
  ask: number,
  spreadThreshold: number = 0.5
): SignalOutput {
  const spread = ((ask - bid) / currentPrice) * 100;
  if (spread > spreadThreshold) {
    const side = currentPrice - bid < ask - currentPrice ? 'buy' : 'sell';
    return {
      direction: side,
      confidence: Math.min(spread, 100),
      indicators: { bid, ask, spread },
      reason: `market making side ${side} due to spread ${spread.toFixed(2)}%`,
    };
  }
  return { direction: 'hold', confidence: 0, indicators: { bid, ask, spread }, reason: 'spread too tight' };
}

// ─── Event Probability Signal ────────────────────────────────────

export function eventProbabilitySignal(
  estimatedProb: number,
  fairProb: number,
  confidenceScale: number = 50
): SignalOutput {
  const diff = estimatedProb - fairProb;
  if (Math.abs(diff) < 0.01) {
    return { direction: 'hold', confidence: 0, indicators: { estimatedProb, fairProb }, reason: 'no edge' };
  }
  const direction = diff > 0 ? 'buy' : 'sell';
  const confidence = Math.min(Math.abs(diff) * confidenceScale, 100);
  return {
    direction,
    confidence,
    indicators: { estimatedProb, fairProb, diff },
    reason: `edge ${diff.toFixed(3)} against fair price`,
  };
}
