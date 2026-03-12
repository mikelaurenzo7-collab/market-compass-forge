import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { BacktestEngine, LLMTradingStrategy } from '@beastbots/backtest';
import { Bot, BotFamily } from '@beastbots/shared';

const app = new Hono();

const backtestSchema = z.object({
  botId: z.string(),
  // For now, we'll just pass a symbol and some dummy data
  // In the future, we'll fetch historical data from a real source
  symbol: z.string(),
  data: z.array(z.any()),
});

app.post('/', zValidator('json', backtestSchema), async (c) => {
  const { botId, symbol, data } = c.req.valid('json');

  // In a real app, you'd fetch the bot configuration from your database
  const bot: Bot = {
    id: botId,
    name: 'My Trading Bot',
    family: BotFamily.Trading,
    // ... other bot properties
  };

  const strategy = new LLMTradingStrategy(symbol);
  const engine = new BacktestEngine(strategy, bot);

  const summary = await engine.run(data);

  return c.json(summary);
});

export const backtest = app;
