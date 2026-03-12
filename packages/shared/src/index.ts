
// ─── Core Types ────────────────────────────────────────────────

export type BotFamily = 'trading' | 'store' | 'social' | 'workforce';

export type IntegrationCategory = 'trading' | 'ecommerce' | 'social' | 'workforce' | 'communication' | 'project_management' | 'crm';

export type TradingPlatform = 'coinbase' | 'binance' | 'alpaca' | 'kalshi' | 'polymarket';
export type StorePlatform = 'shopify' | 'amazon' | 'etsy' | 'ebay' | 'square' | 'woocommerce';
export type SocialPlatform = 'x' | 'tiktok' | 'instagram' | 'facebook' | 'linkedin' | 'youtube';
export type Platform = TradingPlatform | StorePlatform | SocialPlatform | WorkforceCategory;

export type BotStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'error';
export type SafetyAction = 'allow' | 'deny' | 'require_approval';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ... (rest of the file is unchanged until Trading Bot Types)

// ─── Trading Bot Types ─────────────────────────────────────────

// Renamed to avoid conflict with the TradingStrategy interface
export type TradingStrategyName =
  | 'dca'
  | 'momentum'
  | 'mean_reversion'
  | 'grid'
  | 'arbitrage'
  | 'market_making'
  | 'event_probability'
  | 'llm'; // Added llm strategy

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit';

export interface TradeSignal {
  platform: TradingPlatform;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  confidence: number;
  strategy: TradingStrategyName; // Use the renamed type
  indicators: Record<string, number | string>;
  timestamp: number;
}

// ... (Position and OpenPosition interfaces are unchanged)

export interface TradingBotConfig {
  platform: TradingPlatform;
  strategy: TradingStrategyName; // Use the renamed type
  symbols: string[];
  maxPositionSizeUsd: number;
  maxDailyLossUsd: number;
  maxOpenPositions: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopPercent?: number;
  cooldownAfterLossMs: number;
  paperTrading: boolean;
  useLLM?: boolean;
  autonomyLevel?: AutonomyLevel;
  multiTimeframeConfirmation?: boolean;
  // ... (rest of the config is unchanged)
}

// ... (rest of the file is unchanged until Re-exports)

// ─── Re-exports ────────────────────────────────────────────────

export * from './safety.js';
export * from './llm.js';
export * from './prompts.js';
export * from './trading/strategy.js'; // Export the new strategy interface
export * from './trading/indicators.js';
export * from './trading/engine.js';
export * from './trading/adapters.js';
export * from './trading/backtest.js';
export * from './store/strategies.js';
export * from './store/engine.js';
export * from './store/adapters.js';
export * from './social/strategies.js';
export * from './social/engine.js';
export * from './social/adapters.js';
export * from './workforce/strategies.js';
export * from './workforce/engine.js';
export * from './workforce/adapters.js';
// ... (rest of re-exports)
