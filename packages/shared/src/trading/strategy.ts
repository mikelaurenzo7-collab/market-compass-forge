import type { IndicatorValues } from './indicators';
import type { MarketData } from '../index';
import type { TradingEngineState } from './engine';

/**
 * Represents the input for a trading strategy's decision-making process.
 */
export interface TradingStrategyInput {
  indicators: IndicatorValues;
  marketData: MarketData;
  state: TradingEngineState;
}

/**
 * Represents the output of a trading strategy.
 */
export type TradingSignal = {
  direction: 'buy' | 'sell' | 'hold';
  confidence: number;
  indicators: Record<string, number | string>;
  reason: string;
};

/**
 * Defines the contract for a trading strategy.
 * A trading strategy is responsible for making decisions about when to buy, sell, or hold.
 */
export interface TradingStrategy {
  decide(input: TradingStrategyInput): Promise<TradingSignal>;
}
