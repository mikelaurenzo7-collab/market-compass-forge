import { TradingStrategy, TradingStrategyInput, TradingSignal, Bot, BacktestEngine, MarketData, TradingBotConfig, SafetyContext, createDefaultBudget, createDefaultCircuitBreaker, createDefaultPolicies } from '@beastbots/shared';

// Step 1: Create a custom trading strategy
class MomentumStrategy implements TradingStrategy {
  async decide(input: TradingStrategyInput): Promise<TradingSignal> {
    const { marketData, indicators } = input;
    const { sma50 } = indicators;

    if (marketData.price > sma50) {
      return {
        direction: 'buy',
        confidence: 80,
        indicators: { sma50 },
        reason: 'Price is above the 50-day SMA'
      };
    } else if (marketData.price < sma50) {
      return {
        direction: 'sell',
        confidence: 80,
        indicators: { sma50 },
        reason: 'Price is below the 50-day SMA'
      };
    }

    return {
      direction: 'hold',
      confidence: 50,
      indicators: { sma50 },
      reason: 'Price is at the 50-day SMA'
    };
  }
}

// Step 2: Configure your bot
const botConfig: TradingBotConfig = {
  platform: 'coinbase',
  strategy: 'momentum',
  symbols: ['BTC-USD'],
  maxPositionSizeUsd: 1000,
  maxDailyLossUsd: 500,
  maxOpenPositions: 1,
  stopLossPercent: 2,
  takeProfitPercent: 5,
  cooldownAfterLossMs: 60000,
  paperTrading: true,
};

const safetyContext: SafetyContext = {
  tenantId: 'beast-bots',
  botId: 'test-bot-1',
  platform: 'coinbase',
  policies: createDefaultPolicies('trading'),
  budget: createDefaultBudget('trading'),
  circuitBreaker: createDefaultCircuitBreaker(),
};

const bot: Bot = {
    id: 'test-bot-1',
    tenantId: 'beast-bots',
    family: 'trading',
    platform: 'coinbase',
    status: 'running',
    config: botConfig,
    safety: safetyContext,
    lastTickAt: 0,
    createdAt: Date.now(),
    metrics: { totalTicks: 0, successfulActions: 0, failedActions: 0, deniedActions: 0, totalPnlUsd: 0, uptimeMs: 0 },
};

// Step 3: Run the backtest
async function runBacktest() {
  // Instantiate your strategy
  const strategy = new MomentumStrategy();

  // Create the BacktestEngine
  const backtestEngine = new BacktestEngine(strategy, bot);

  // Generate some sample market data
  const sampleData: MarketData[] = Array.from({ length: 100 }, (_, i) => ({
    symbol: 'BTC-USD',
    price: 50000 + (i * 100) * Math.sin(i / 10),
    volume24h: 1000000,
    high24h: 50000 + (i * 100) * Math.sin(i / 10) + 100,
    low24h: 50000 + (i * 100) * Math.sin(i / 10) - 100,
    change24hPercent: Math.sin(i / 10),
    bid: 50000 + (i * 100) * Math.sin(i / 10) - 1,
    ask: 50000 + (i * 100) * Math.sin(i / 10) + 1,
    timestamp: Date.now() + i * 60000,
  }));

  // Run the backtest
  const summary = await backtestEngine.run(sampleData);

  // Step 4: Analyze the results
  console.log('--- Backtest Summary ---');
  console.log(`Total P&L: $${summary.pnl.toFixed(2)}`);
  console.log(`Total Trades: ${summary.orders.length}`);
  console.log('--- Trades ---');
  summary.orders.forEach(order => {
    console.log(`${order.side.toUpperCase()} ${order.quantity.toFixed(4)} ${order.symbol} @ ${order.price?.toFixed(2)}`);
  });
}

runBacktest();
