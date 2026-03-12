import { LLM, TradingStrategy, TradingStrategyInput, TradingSignal } from '@beastbots/shared';

/**
 * A trading strategy that uses a Large Language Model (LLM) to make decisions.
 * The LLM is hosted on Vertex AI and is fine-tuned for trading.
 */
export class LLMTradingStrategy implements TradingStrategy {
  private llm: LLM;

  constructor(private symbol: string, private model: string = 'gemini-pro-trading') {
    // Note: We specify a different model endpoint, e.g., 'gemini-pro-trading'
    this.llm = new LLM({ model });
  }

  async decide(input: TradingStrategyInput): Promise<TradingSignal> {
    const { indicators, marketData } = input;

    // Construct a detailed prompt with all the available data
    const prompt = `
      You are an elite trading bot. Your only goal is to maximize profit.
      You are analyzing the market for ${this.symbol}.

      ## Market Data
      - Price: ${marketData.price}
      - 24h Change: ${marketData.change24hPercent}%
      - 24h Volume: ${marketData.volume24h}

      ## Technical Indicators
      - RSI: ${indicators.rsi}
      - MACD Histogram: ${indicators.macd.histogram}
      - EMA (12/26): ${indicators.ema12} / ${indicators.ema26}
      - Bollinger Bands: Lower ${indicators.bollingerBands.lower}, Middle ${indicators.bollingerBands.middle}, Upper ${indicators.bollingerBands.upper}
      - ADX: ${indicators.adx}
      - Stochastic RSI: ${indicators.stochRsi}

      Based on this data, should you BUY, SELL, or HOLD?

      Respond with a single word and a confidence score (0-100), separated by a comma. For example: BUY,85
    `;

    const response = await this.llm.generate(prompt);

    const [decision, confidence] = response.trim().split(',');

    const direction = decision.toUpperCase() as 'BUY' | 'SELL' | 'HOLD';

    return {
      direction: direction === 'BUY' ? 'buy' : direction === 'SELL' ? 'sell' : 'hold',
      confidence: parseInt(confidence, 10) || 50,
      indicators: {
        rsi: indicators.rsi,
        macd: indicators.macd.histogram,
        adx: indicators.adx,
        stochRsi: indicators.stochRsi,
      },
      reason: `LLM decided ${direction} with ${confidence}% confidence.`
    };
  }
}
