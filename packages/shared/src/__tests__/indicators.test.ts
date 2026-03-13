import { describe, it, expect } from 'vitest';
import {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  vwap,
  obv,
  computeIndicators,
  momentumSignal,
  meanReversionSignal,
  dcaSignal,
  gridSignal,
  arbitrageSignal,
  marketMakingSignal,
  eventProbabilitySignal,
  stochasticRsi,
  adx,
  computeIchimoku,
  computeFibLevels,
} from '../trading/indicators';

// Helper: generate a simple price series
function priceSeries(base: number, count: number, trend: number = 0): number[] {
  return Array.from({ length: count }, (_, i) => base + i * trend + (Math.sin(i) * 2));
}

describe('Trading Indicators', () => {
  describe('sma', () => {
    it('computes simple moving average for exact period', () => {
      expect(sma([10, 20, 30], 3)).toBeCloseTo(20, 5);
    });

    it('uses last N prices when data exceeds period', () => {
      expect(sma([5, 10, 20, 30, 40], 3)).toBeCloseTo(30, 5);
    });

    it('returns last price when data is shorter than period', () => {
      expect(sma([42], 14)).toBe(42);
    });
  });

  describe('ema', () => {
    it('returns 0 for empty array', () => {
      expect(ema([], 12)).toBe(0);
    });

    it('returns the single value for length-1 array', () => {
      expect(ema([100], 12)).toBe(100);
    });

    it('produces a value between min and max of the series', () => {
      const prices = [10, 15, 12, 18, 20, 14, 16];
      const result = ema(prices, 5);
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(20);
    });
  });

  describe('rsi', () => {
    it('returns 50 when not enough data', () => {
      expect(rsi([10, 11, 12], 14)).toBe(50);
    });

    it('returns 100 when all changes are positive', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      expect(rsi(prices, 14)).toBe(100);
    });

    it('returns value between 0 and 100', () => {
      const prices = priceSeries(100, 30, 0.5);
      const result = rsi(prices, 14);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('macd', () => {
    it('returns macd, signal, and histogram', () => {
      const prices = priceSeries(100, 30, 0.3);
      const result = macd(prices);
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('histogram');
      expect(typeof result.histogram).toBe('number');
    });
  });

  describe('bollingerBands', () => {
    it('returns upper, middle, lower, bandwidth', () => {
      const prices = priceSeries(100, 25);
      const bb = bollingerBands(prices, 20);
      expect(bb.upper).toBeGreaterThan(bb.middle);
      expect(bb.lower).toBeLessThan(bb.middle);
      expect(bb.bandwidth).toBeGreaterThan(0);
    });
  });

  describe('atr', () => {
    it('returns 0 for single bar', () => {
      expect(atr([100], [90], [95], 14)).toBe(0);
    });

    it('computes positive ATR for multi-bar data', () => {
      const highs = [105, 108, 110, 107, 112];
      const lows = [95, 98, 100, 97, 102];
      const closes = [100, 105, 108, 103, 109];
      expect(atr(highs, lows, closes, 3)).toBeGreaterThan(0);
    });
  });

  describe('vwap', () => {
    it('returns 0 for empty data', () => {
      expect(vwap([], [])).toBe(0);
    });

    it('returns volume-weighted average', () => {
      const prices = [100, 110];
      const volumes = [1000, 3000];
      // (100*1000 + 110*3000) / (4000) = 430000/4000 = 107.5
      expect(vwap(prices, volumes)).toBeCloseTo(107.5, 5);
    });
  });

  describe('obv', () => {
    it('returns 0 for single price', () => {
      expect(obv([100], [1000])).toBe(0);
    });

    it('accumulates volume based on price direction', () => {
      const prices = [100, 110, 105, 115];
      const volumes = [100, 200, 150, 300];
      // up: +200, down: -150, up: +300 = 350
      expect(obv(prices, volumes)).toBe(350);
    });
  });

  describe('computeIndicators', () => {
    it('returns all indicator fields', () => {
      const prices = priceSeries(100, 30);
      const volumes = Array(30).fill(1000);
      const highs = prices.map((p) => p + 5);
      const lows = prices.map((p) => p - 5);
      const result = computeIndicators(prices, volumes, highs, lows);
      expect(result).toHaveProperty('rsi');
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('ema12');
      expect(result).toHaveProperty('ema26');
      expect(result).toHaveProperty('sma20');
      expect(result).toHaveProperty('sma50');
      expect(result).toHaveProperty('bollingerBands');
      expect(result).toHaveProperty('atr');
      expect(result).toHaveProperty('vwap');
    });
  });

  describe('Signal Generators', () => {
    const bullishIndicators = computeIndicators(
      Array.from({ length: 30 }, (_, i) => 90 + i * 2),  // strong uptrend
      Array(30).fill(5000),
      Array.from({ length: 30 }, (_, i) => 92 + i * 2),
      Array.from({ length: 30 }, (_, i) => 88 + i * 2),
    );

    it('momentumSignal produces buy/sell/hold with confidence', () => {
      const signal = momentumSignal(bullishIndicators, 150);
      expect(['buy', 'sell', 'hold']).toContain(signal.direction);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(100);
      expect(signal.reason.length).toBeGreaterThan(0);
    });

    it('meanReversionSignal detects extremes', () => {
      const signal = meanReversionSignal(bullishIndicators, 150);
      expect(['buy', 'sell', 'hold']).toContain(signal.direction);
      expect(signal.indicators).toHaveProperty('bbPosition');
    });

    it('dcaSignal triggers buy when interval elapsed', () => {
      const signal = dcaSignal(Date.now() - 100_000, 50_000);
      expect(signal.direction).toBe('buy');
      expect(signal.confidence).toBe(80);
    });

    it('dcaSignal holds when interval not reached', () => {
      const signal = dcaSignal(Date.now() - 10_000, 50_000);
      expect(signal.direction).toBe('hold');
    });

    it('gridSignal finds closest unfilled buy level', () => {
      const signal = gridSignal(100, [90, 95, 105, 110], []);
      expect(['buy', 'sell']).toContain(signal.direction);
      expect(signal.confidence).toBe(70);
    });

    it('gridSignal returns hold when all levels filled', () => {
      const levels = [90, 110];
      const openOrders = [
        { price: 90, side: 'buy' as const },
        { price: 110, side: 'sell' as const },
      ];
      const signal = gridSignal(100, levels, openOrders);
      expect(signal.direction).toBe('hold');
    });

    it('arbitrageSignal buys when spread exceeds threshold', () => {
      const prices = [100, 105, 110];
      const signal = arbitrageSignal(prices, 3);
      expect(signal.direction).toBe('buy');
      expect(signal.confidence).toBeGreaterThan(0);
    });

    it('marketMakingSignal holds when spread is tight', () => {
      const signal = marketMakingSignal(100, 99.5, 100.5, 1);
      expect(signal.direction).toBe('hold');
    });

    it('eventProbabilitySignal signals buy when estimated > fair', () => {
      const signal = eventProbabilitySignal(0.6, 0.5);
      expect(signal.direction).toBe('buy');
      expect(signal.confidence).toBeGreaterThan(0);
    });
  });

  describe('Phase 2 Indicators', () => {
    it('stochasticRsi returns 50 with insufficient data', () => {
      expect(stochasticRsi([100, 101, 102], 14)).toBe(50);
    });

    it('stochasticRsi returns value between 0 and 100 with sufficient data', () => {
      const prices = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 10);
      const result = stochasticRsi(prices, 14);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('adx returns 25 (neutral) with insufficient data', () => {
      expect(adx([100, 102], [98, 99], [101, 101], 14)).toBe(25);
    });

    it('adx computes positive value with sufficient trending data', () => {
      const n = 60;
      const highs = Array.from({ length: n }, (_, i) => 105 + i * 2);
      const lows = Array.from({ length: n }, (_, i) => 95 + i * 2);
      const closes = Array.from({ length: n }, (_, i) => 100 + i * 2);
      const result = adx(highs, lows, closes, 14);
      expect(result).toBeGreaterThan(0);
    });

    it('computeIchimoku returns cloud values with sufficient data', () => {
      const prices = Array.from({ length: 60 }, (_, i) => 100 + i);
      const result = computeIchimoku(prices);
      expect(result).toHaveProperty('conversion');
      expect(result).toHaveProperty('base');
      expect(result).toHaveProperty('spanA');
      expect(result).toHaveProperty('spanB');
      expect(result.conversion).toBeGreaterThan(0);
    });

    it('computeIchimoku returns fallback for short data', () => {
      const result = computeIchimoku([100, 101, 102]);
      expect(result.conversion).toBe(102);
      expect(result.base).toBe(102);
    });

    it('computeFibLevels returns 5 retracement levels', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
      const result = computeFibLevels(prices);
      expect(result.levels).toHaveLength(5);
      expect(result.levels[0]).toBeLessThan(result.levels[4]);
    });

    it('computeFibLevels returns empty for no data', () => {
      expect(computeFibLevels([]).levels).toHaveLength(0);
    });
  });

  describe('Phase 2 Signal Integration', () => {
    it('momentumSignal uses ADX to amplify strong trend signals', () => {
      const strongTrend = computeIndicators(
        Array.from({ length: 60 }, (_, i) => 90 + i * 3),
        Array(60).fill(5000),
        Array.from({ length: 60 }, (_, i) => 92 + i * 3),
        Array.from({ length: 60 }, (_, i) => 88 + i * 3),
      );
      const signal = momentumSignal(strongTrend, 260);
      expect(signal.reason).toContain('ADX');
      expect(signal.indicators).toHaveProperty('adx');
      expect(signal.indicators).toHaveProperty('stochRsi');
    });

    it('momentumSignal includes Ichimoku cloud in reasoning', () => {
      const prices = Array.from({ length: 60 }, (_, i) => 90 + i * 2);
      const indicators = computeIndicators(
        prices,
        Array(60).fill(5000),
        prices.map(p => p + 3),
        prices.map(p => p - 3),
      );
      const signal = momentumSignal(indicators, 200);
      expect(signal.reason).toContain('Ichimoku');
    });

    it('meanReversionSignal uses ADX to filter trending markets', () => {
      const indicators = computeIndicators(
        Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 2) * 5),
        Array(60).fill(3000),
        Array.from({ length: 60 }, (_, i) => 103 + Math.sin(i / 2) * 5),
        Array.from({ length: 60 }, (_, i) => 97 + Math.sin(i / 2) * 5),
      );
      const signal = meanReversionSignal(indicators, 100);
      expect(signal.reason).toContain('ADX');
      expect(signal.indicators).toHaveProperty('adx');
      expect(signal.indicators).toHaveProperty('stochRsi');
    });
  });
});
