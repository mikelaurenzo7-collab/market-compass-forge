export type BotFamily = 'trading' | 'store' | 'social' | 'workforce';

// ─── Bot sub-types (one per domain) ──────────────────────────────────────────

/** Specific trading domain — crypto, equities, or prediction markets. */
export type TradingBotType = 'crypto' | 'stocks' | 'predictions';

/** E-commerce platform slug — one bot per storefront. */
export type StoreBotPlatform =
  | 'shopify'
  | 'amazon'
  | 'etsy'
  | 'square'
  | 'woocommerce'
  | 'ebay';

/** Social media platform slug — one bot per channel. */
export type SocialBotPlatform =
  | 'x'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'linkedin';

/** Union of all specific bot subtypes. */
export type BotSubtype = TradingBotType | StoreBotPlatform | SocialBotPlatform;

// ─── User risk and autonomy controls ─────────────────────────────────────────

/** How much risk the user is comfortable with. */
export type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

/**
 * How much independence the bot has.
 * - `supervised`       – every significant action requires human approval
 * - `semi-autonomous`  – acts freely below the approval threshold
 * - `fully-autonomous` – acts freely within budget/loss limits, no approval queue
 */
export type AutonomyLevel = 'supervised' | 'semi-autonomous' | 'fully-autonomous';

/**
 * User-configured risk profile — the user is always in control.
 * The bot MUST respect every field here and never exceed these guardrails.
 */
export interface UserRiskProfile {
  riskLevel: RiskLevel;
  autonomyLevel: AutonomyLevel;
  /** Maximum single-trade / single-action size in USD. */
  maxActionUsd: number;
  /** Daily loss cap in USD before the circuit breaker trips. */
  dailyLossLimitUsd: number;
  /** Total budget allocated to this bot in USD. */
  budgetUsd: number;
  /**
   * Require human approval for any action whose notional value exceeds this
   * threshold (unless autonomyLevel is `fully-autonomous`).
   */
  requireApprovalAboveUsd: number;
}

// ─── Bot strategies ───────────────────────────────────────────────────────────

/** Elite trading strategies — applied to crypto, stock, and prediction bots. */
export type TradingStrategy =
  | 'dca'
  | 'momentum'
  | 'mean-reversion'
  | 'breakout'
  | 'arbitrage'
  | 'grid';

/** Elite e-commerce automation strategies. */
export type StoreStrategy =
  | 'dynamic-pricing'
  | 'inventory-restock'
  | 'ad-campaign'
  | 'product-promotion'
  | 'review-response';

/** Elite social media automation strategies. */
export type SocialStrategy =
  | 'content-schedule'
  | 'engagement-boost'
  | 'ad-promotion'
  | 'trend-monitor'
  | 'influencer-outreach';

export type BotStrategy = TradingStrategy | StoreStrategy | SocialStrategy;

// ─── Loop / frequency configuration ──────────────────────────────────────────

/**
 * Runtime loop intervals.
 * Trading bots run every 1 s (24/7 via Cloudflare Durable Objects).
 * Store and social bots use longer intervals to stay optimised but not
 * hammering external APIs.
 */
export interface LoopConfig {
  /** Trading bots: 1-second heartbeat loop, 24/7 via Cloudflare DO. */
  tradingLoopSeconds: number;
  /** Store bots: default 600 s (10 min). */
  storeLoopSeconds: number;
  /** Social bots: default 900 s (15 min). */
  socialLoopSeconds: number;
}

export const DEFAULT_LOOP_CONFIG: LoopConfig = {
  tradingLoopSeconds: 1,
  storeLoopSeconds: 600,
  socialLoopSeconds: 900,
};

// ─── Bot instance configuration ───────────────────────────────────────────────

/**
 * Full configuration for a user-created bot instance.
 * Stored server-side; drives the DO runtime and approval queue.
 */
export interface BotInstanceConfig {
  id: string;
  tenantId: string;
  family: BotFamily;
  /** Specific platform / domain this instance is wired to. */
  subtype: BotSubtype;
  name: string;
  /** Active strategies — must be valid for the bot's family. */
  strategies: BotStrategy[];
  riskProfile: UserRiskProfile;
  /** Whether the bot is actively running. */
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type IntegrationCategory = 'trading' | 'ecommerce' | 'social';

export type PricingTier = 'starter' | 'pro' | 'enterprise';

export type IntegrationStatus = 'planned' | 'beta' | 'ga';

export interface IntegrationDefinition {
  id: string;
  category: IntegrationCategory;
  displayName: string;
  oauth: boolean;
  status: IntegrationStatus;
}

export interface PricingPlan {
  family: BotFamily;
  tier: PricingTier;
  monthlyUsd: number;
  includedUsageUsd: number;
}

/** Standard JSON envelope returned by all BeastBots API responses. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiSuccessResponse<T> = ApiResponse<T> & { success: true; data: T };
export type ApiErrorResponse = ApiResponse<never> & { success: false; error: ApiError };

/** Well-known error codes used across the platform. */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Approval queue item for high-risk bot actions. */
export interface ApprovalItem {
  id: string;
  tenantId: string;
  botId: string;
  action: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

/** Bot runtime status returned by the workers layer. */
export interface BotRuntimeStatus {
  botId: string;
  tenantId: string;
  family: BotFamily;
  /** Specific platform / domain sub-type (present when set). */
  subtype?: BotSubtype;
  running: boolean;
  loopSeconds: number;
  circuitOpen: boolean;
  budgetRemainingUsd: number;
  lastHeartbeat: string;
  /** Active strategies in use by this bot. */
  strategies?: BotStrategy[];
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  { id: 'coinbase', category: 'trading', displayName: 'Coinbase', oauth: true, status: 'beta' },
  { id: 'binance', category: 'trading', displayName: 'Binance', oauth: true, status: 'beta' },
  { id: 'kalshi', category: 'trading', displayName: 'Kalshi', oauth: true, status: 'beta' },
  { id: 'polymarket', category: 'trading', displayName: 'Polymarket', oauth: true, status: 'planned' },
  { id: 'alpaca', category: 'trading', displayName: 'Alpaca', oauth: true, status: 'beta' },
  { id: 'shopify', category: 'ecommerce', displayName: 'Shopify', oauth: true, status: 'beta' },
  { id: 'amazon', category: 'ecommerce', displayName: 'Amazon', oauth: true, status: 'planned' },
  { id: 'etsy', category: 'ecommerce', displayName: 'Etsy', oauth: true, status: 'planned' },
  { id: 'square', category: 'ecommerce', displayName: 'Square', oauth: true, status: 'beta' },
  { id: 'woocommerce', category: 'ecommerce', displayName: 'WooCommerce', oauth: true, status: 'planned' },
  { id: 'ebay', category: 'ecommerce', displayName: 'eBay', oauth: true, status: 'planned' },
  { id: 'x', category: 'social', displayName: 'X / Twitter', oauth: true, status: 'beta' },
  { id: 'tiktok', category: 'social', displayName: 'TikTok', oauth: true, status: 'planned' },
  { id: 'instagram', category: 'social', displayName: 'Instagram', oauth: true, status: 'planned' },
  { id: 'facebook', category: 'social', displayName: 'Facebook', oauth: true, status: 'planned' },
  { id: 'linkedin', category: 'social', displayName: 'LinkedIn', oauth: true, status: 'planned' }
];

export const DEFAULT_PRICING: PricingPlan[] = [
  { family: 'trading', tier: 'starter', monthlyUsd: 399, includedUsageUsd: 75 },
  { family: 'trading', tier: 'pro', monthlyUsd: 1249, includedUsageUsd: 300 },
  { family: 'trading', tier: 'enterprise', monthlyUsd: 3999, includedUsageUsd: 1000 },
  { family: 'store', tier: 'starter', monthlyUsd: 249, includedUsageUsd: 50 },
  { family: 'store', tier: 'pro', monthlyUsd: 799, includedUsageUsd: 150 },
  { family: 'store', tier: 'enterprise', monthlyUsd: 2499, includedUsageUsd: 600 },
  { family: 'social', tier: 'starter', monthlyUsd: 149, includedUsageUsd: 25 },
  { family: 'social', tier: 'pro', monthlyUsd: 499, includedUsageUsd: 75 },
  { family: 'social', tier: 'enterprise', monthlyUsd: 1499, includedUsageUsd: 300 },
  { family: 'workforce', tier: 'starter', monthlyUsd: 999, includedUsageUsd: 200 },
  { family: 'workforce', tier: 'pro', monthlyUsd: 2999, includedUsageUsd: 500 },
  { family: 'workforce', tier: 'enterprise', monthlyUsd: 7999, includedUsageUsd: 2000 },
];
