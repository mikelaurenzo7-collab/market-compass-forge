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

export interface IntegrationDefinition {
  id: string;
  category: IntegrationCategory;
  displayName: string;
  oauth: boolean;
  status: 'planned' | 'beta' | 'ga';
}

export interface PricingPlan {
  family: BotFamily;
  tier: 'starter' | 'pro' | 'enterprise';
  monthlyUsd: number;
  includedUsageUsd: number;
}

// ─── Safety Model Types ────────────────────────────────────────

export interface PolicyRule {
  id: string;
  description: string;
  condition: string;
  action: SafetyAction;
  riskLevel: RiskLevel;
}

export interface BudgetConfig {
  maxDailySpendUsd: number;
  maxPerActionUsd: number;
  warningThresholdPercent: number;
  currentSpentUsd: number;
}

export interface CircuitBreakerConfig {
  maxConsecutiveErrors: number;
  maxErrorRatePercent: number;
  windowSizeMs: number;
  cooldownMs: number;
  currentErrors: number;
  isTripped: boolean;
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  botId: string;
  platform: Platform;
  action: string;
  result: 'success' | 'failure' | 'denied' | 'pending_approval';
  riskLevel: RiskLevel;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface SafetyContext {
  tenantId: string;
  botId: string;
  platform: Platform;
  policies: PolicyRule[];
  budget: BudgetConfig;
  circuitBreaker: CircuitBreakerConfig;
}

// ─── Trading Bot Types ─────────────────────────────────────────

export type TradingStrategy =
  | 'dca'
  | 'momentum'
  | 'mean_reversion'
  | 'grid'
  | 'arbitrage'
  | 'market_making'
  | 'event_probability';

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
  strategy: TradingStrategy;
  indicators: Record<string, number>;
  timestamp: number;
}

export interface Position {
  platform: TradingPlatform;
  symbol: string;
  side: OrderSide;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnl: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: number;
}

export type AutonomyLevel = 'manual' | 'suggest' | 'auto';

export interface EventProbabilityData {
  eventId: string;
  market: string;
  currentProbability: number;
  historicalProbabilities?: number[];
  expiresAt?: number;
  estimated?: number;
  fair?: number;
}

export interface TradingBotConfig {
  platform: TradingPlatform;
  strategy: TradingStrategy;
  symbols: string[];
  maxPositionSizeUsd: number;
  maxDailyLossUsd: number;
  maxOpenPositions: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  cooldownAfterLossMs: number;
  paperTrading: boolean;
  useLLM?: boolean;
  autonomyLevel?: AutonomyLevel;
  // optional strategy-specific parameters
  gridLevels?: number[];
  openOrders?: { price: number; side: 'buy' | 'sell' }[];
  arbitrageThresholdPercent?: number;
  marketMakingSpread?: number;
  eventProbabilityData?: EventProbabilityData;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  change24hPercent: number;
  bid: number;
  ask: number;
  timestamp: number;
}

// ─── Store Bot Types ───────────────────────────────────────────

export type StoreStrategy =
  | 'dynamic_pricing'
  | 'inventory_forecast'
  | 'listing_optimization'
  | 'cross_platform_sync'
  | 'competitor_monitoring'
  | 'review_management';

export interface Product {
  id: string;
  platform: StorePlatform;
  title: string;
  price: number;
  costOfGoods: number;
  inventory: number;
  category: string;
  tags: string[];
  status: 'active' | 'draft' | 'archived';
  url?: string;
}

export interface PricingAction {
  productId: string;
  platform: StorePlatform;
  currentPrice: number;
  recommendedPrice: number;
  reason: string;
  confidence: number;
  minPrice: number;
  maxPrice: number;
}

export interface InventoryForecast {
  productId: string;
  platform: StorePlatform;
  currentStock: number;
  dailyVelocity: number;
  daysUntilStockout: number;
  reorderPoint: number;
  recommendedReorderQty: number;
  seasonalFactor: number;
}

export interface StoreBotConfig {
  platform: StorePlatform;
  strategies: StoreStrategy[];
  maxPriceChangePercent: number;
  minMarginPercent: number;
  syncIntervalMs: number;
  autoApplyPricing: boolean;
  autoReorder: boolean;
  paperMode: boolean;
  useLLM?: boolean;
  autonomyLevel?: AutonomyLevel;
}

// ─── Social Bot Types ──────────────────────────────────────────

export type SocialStrategy =
  | 'content_calendar'
  | 'engagement_automation'
  | 'trend_detection'
  | 'audience_analytics'
  | 'cross_post_optimization'
  | 'hashtag_optimization';

export type ContentFormat = 'text' | 'image' | 'video' | 'carousel' | 'story' | 'reel' | 'thread' | 'article';

export interface ScheduledPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  format: ContentFormat;
  hashtags: string[];
  scheduledAt: number;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  engagementScore?: number;
}

export interface AudienceMetrics {
  platform: SocialPlatform;
  followers: number;
  followersGrowthPercent: number;
  engagementRate: number;
  avgReach: number;
  bestPostingHours: number[];
  topHashtags: string[];
  audienceTimezone: string;
}

export interface TrendSignal {
  platform: SocialPlatform;
  topic: string;
  hashtag: string;
  volume: number;
  velocityPercent: number;
  relevanceScore: number;
  detectedAt: number;
}

export interface SocialBotConfig {
  platform: SocialPlatform;
  strategies: SocialStrategy[];
  maxPostsPerDay: number;
  maxEngagementsPerHour: number;
  contentApprovalRequired: boolean;
  sensitiveTopicKeywords: string[];
  brandVoiceGuidelines: string;
  paperMode: boolean;
  useLLM?: boolean;
  autonomyLevel?: AutonomyLevel;
}

// ─── Workforce Bot Types ───────────────────────────────────────

export type WorkforceCategory =
  | 'customer_support'
  | 'sales_crm'
  | 'finance'
  | 'hr'
  | 'document_processing'
  | 'email_management'
  | 'scheduling'
  | 'compliance'
  | 'it_ops'
  | 'reporting'
  | 'project_management'
  | 'procurement';

export type WorkforceStrategy =
  | 'ticket_triage'
  | 'auto_response'
  | 'lead_scoring'
  | 'crm_enrichment'
  | 'invoice_processing'
  | 'expense_reconciliation'
  | 'employee_onboarding'
  | 'shift_scheduling'
  | 'document_classification'
  | 'data_extraction'
  | 'email_triage'
  | 'meeting_scheduler'
  | 'compliance_monitoring'
  | 'audit_preparation'
  | 'system_health_check'
  | 'report_generation'
  | 'task_orchestration'
  | 'vendor_evaluation'
  | 'contract_review'
  | 'knowledge_base_sync';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'escalated' | 'failed';

export interface WorkforceTask {
  id: string;
  category: WorkforceCategory;
  strategy: WorkforceStrategy;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignee?: string;
  inputData: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  deadlineAt?: number;
  retryCount: number;
  maxRetries?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface WorkforceTaskResult {
  taskId: string;
  status: TaskStatus;
  success?: boolean;
  action?: string;
  details?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  nextTasks?: WorkforceTask[];
  confidence?: number;
  strategy?: WorkforceStrategy;
  durationMs?: number;
  processingMs?: number;
  costUsd?: number;
  requiresHumanReview?: boolean;
  escalated?: boolean;
  escalationReason?: string;
}

export interface WorkforceBotConfig {
  category: WorkforceCategory;
  strategies: WorkforceStrategy[];
  maxTasksPerHour: number;
  maxConcurrentTasks: number;
  requireApprovalForExternal: boolean;
  escalationThresholdConfidence: number;
  dataAccessScopes: string[];
  workingHoursUtc?: { start: number; end: number };
  paperMode: boolean;
  useLLM?: boolean;
  autonomyLevel?: AutonomyLevel;
}

// ─── Bot Runtime Types ─────────────────────────────────────────

export interface BotRuntime {
  id: string;
  tenantId: string;
  family: BotFamily;
  platform: Platform;
  status: BotStatus;
  config: TradingBotConfig | StoreBotConfig | SocialBotConfig | WorkforceBotConfig;
  safety: SafetyContext;
  lastTickAt: number;
  createdAt: number;
  metrics: BotMetrics;
}

export interface BotMetrics {
  totalTicks: number;
  successfulActions: number;
  failedActions: number;
  deniedActions: number;
  totalPnlUsd: number;
  uptimeMs: number;
  lastErrorMessage?: string;
  lastErrorAt?: number;
}

export interface TickResult {
  botId: string;
  timestamp: number;
  action: string;
  result: 'executed' | 'skipped' | 'denied' | 'error';
  details: Record<string, unknown>;
  durationMs: number;
}

// ─── Constants ─────────────────────────────────────────────────

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
  { id: 'linkedin', category: 'social', displayName: 'LinkedIn', oauth: true, status: 'planned' },
  { id: 'youtube', category: 'social', displayName: 'YouTube', oauth: true, status: 'beta' },
  // ─── Workforce Integrations ───────────────────────────────────
  // Communication
  { id: 'slack', category: 'communication', displayName: 'Slack', oauth: true, status: 'beta' },
  { id: 'microsoft_teams', category: 'communication', displayName: 'Microsoft Teams', oauth: true, status: 'beta' },
  { id: 'gmail', category: 'communication', displayName: 'Gmail', oauth: true, status: 'beta' },
  { id: 'outlook', category: 'communication', displayName: 'Outlook / M365', oauth: true, status: 'beta' },
  { id: 'zoom', category: 'communication', displayName: 'Zoom', oauth: true, status: 'planned' },
  // Project Management
  { id: 'notion', category: 'project_management', displayName: 'Notion', oauth: true, status: 'beta' },
  { id: 'jira', category: 'project_management', displayName: 'Jira', oauth: true, status: 'beta' },
  { id: 'asana', category: 'project_management', displayName: 'Asana', oauth: true, status: 'planned' },
  { id: 'monday', category: 'project_management', displayName: 'Monday.com', oauth: true, status: 'planned' },
  { id: 'linear', category: 'project_management', displayName: 'Linear', oauth: true, status: 'planned' },
  { id: 'trello', category: 'project_management', displayName: 'Trello', oauth: true, status: 'planned' },
  // CRM / Finance / HR
  { id: 'salesforce', category: 'crm', displayName: 'Salesforce', oauth: true, status: 'beta' },
  { id: 'hubspot', category: 'crm', displayName: 'HubSpot', oauth: true, status: 'beta' },
  { id: 'zendesk', category: 'crm', displayName: 'Zendesk', oauth: true, status: 'beta' },
  { id: 'quickbooks', category: 'workforce', displayName: 'QuickBooks', oauth: true, status: 'beta' },
  { id: 'xero', category: 'workforce', displayName: 'Xero', oauth: true, status: 'planned' },
  { id: 'gusto', category: 'workforce', displayName: 'Gusto (HR)', oauth: true, status: 'planned' },
  { id: 'workday', category: 'workforce', displayName: 'Workday', oauth: false, status: 'planned' },
  { id: 'google_drive', category: 'workforce', displayName: 'Google Drive', oauth: true, status: 'beta' },
  { id: 'dropbox', category: 'workforce', displayName: 'Dropbox', oauth: true, status: 'planned' },
  { id: 'docusign', category: 'workforce', displayName: 'DocuSign', oauth: true, status: 'planned' },
  { id: 'servicenow', category: 'workforce', displayName: 'ServiceNow', oauth: true, status: 'planned' }
];

export const DEFAULT_PRICING: PricingPlan[] = [
  { family: 'trading', tier: 'starter', monthlyUsd: 399, includedUsageUsd: 75 },
  { family: 'trading', tier: 'pro', monthlyUsd: 1249, includedUsageUsd: 300 },
  { family: 'trading', tier: 'enterprise', monthlyUsd: 4999, includedUsageUsd: 2000 },
  { family: 'store', tier: 'starter', monthlyUsd: 249, includedUsageUsd: 50 },
  { family: 'store', tier: 'pro', monthlyUsd: 799, includedUsageUsd: 150 },
  { family: 'store', tier: 'enterprise', monthlyUsd: 2999, includedUsageUsd: 1000 },
  { family: 'social', tier: 'starter', monthlyUsd: 149, includedUsageUsd: 25 },
  { family: 'social', tier: 'pro', monthlyUsd: 499, includedUsageUsd: 75 },
  { family: 'social', tier: 'enterprise', monthlyUsd: 1499, includedUsageUsd: 500 },
  { family: 'workforce', tier: 'starter', monthlyUsd: 999, includedUsageUsd: 200 },
  { family: 'workforce', tier: 'pro', monthlyUsd: 2999, includedUsageUsd: 500 },
  { family: 'workforce', tier: 'enterprise', monthlyUsd: 9999, includedUsageUsd: 5000 },
];

// ─── Safety Model Defaults ─────────────────────────────────────

export function createDefaultBudget(family: BotFamily): BudgetConfig {
  const limits: Record<BotFamily, { daily: number; perAction: number }> = {
    trading: { daily: 1000, perAction: 500 },
    store: { daily: 500, perAction: 100 },
    social: { daily: 50, perAction: 10 },
    workforce: { daily: 200, perAction: 50 },
  };
  const limit = limits[family];
  return {
    maxDailySpendUsd: limit.daily,
    maxPerActionUsd: limit.perAction,
    warningThresholdPercent: 80,
    currentSpentUsd: 0,
  };
}

export function createDefaultCircuitBreaker(): CircuitBreakerConfig {
  return {
    maxConsecutiveErrors: 5,
    maxErrorRatePercent: 25,
    windowSizeMs: 60_000,
    cooldownMs: 300_000,
    currentErrors: 0,
    isTripped: false,
  };
}

export function createDefaultPolicies(family: BotFamily): PolicyRule[] {
  const base: PolicyRule[] = [
    {
      id: 'require-paper-mode-first',
      description: 'New bots must run in paper mode for at least 24 hours',
      condition: 'bot.totalTicks < 86400',
      action: 'require_approval',
      riskLevel: 'high',
    },
    {
      id: 'budget-exceeded',
      description: 'Block actions when daily budget is exceeded',
      condition: 'budget.currentSpentUsd >= budget.maxDailySpendUsd',
      action: 'deny',
      riskLevel: 'critical',
    },
  ];

  const familyPolicies: Record<BotFamily, PolicyRule[]> = {
    trading: [
      {
        id: 'max-position-size',
        description: 'Limit individual position size',
        condition: 'action.amountUsd > config.maxPositionSizeUsd',
        action: 'deny',
        riskLevel: 'high',
      },
      {
        id: 'daily-loss-limit',
        description: 'Halt trading after daily loss limit hit',
        condition: 'metrics.totalPnlUsd < -config.maxDailyLossUsd',
        action: 'deny',
        riskLevel: 'critical',
      },
    ],
    store: [
      {
        id: 'max-price-change',
        description: 'Cap price changes to configured percentage',
        condition: 'abs(priceChange) > config.maxPriceChangePercent',
        action: 'require_approval',
        riskLevel: 'medium',
      },
      {
        id: 'min-margin-guard',
        description: 'Prevent pricing below minimum margin',
        condition: 'newMargin < config.minMarginPercent',
        action: 'deny',
        riskLevel: 'high',
      },
    ],
    social: [
      {
        id: 'daily-post-limit',
        description: 'Cap daily posts per platform',
        condition: 'dailyPosts >= config.maxPostsPerDay',
        action: 'deny',
        riskLevel: 'medium',
      },
      {
        id: 'sensitive-content-check',
        description: 'Require approval for content matching sensitive keywords',
        condition: 'content.matchesSensitiveKeywords',
        action: 'require_approval',
        riskLevel: 'high',
      },
    ],
    workforce: [
      {
        id: 'external-comms-approval',
        description: 'All external communications require approval',
        condition: 'action.type === "external_communication"',
        action: 'require_approval',
        riskLevel: 'high',
      },
      {
        id: 'max-tasks-per-hour',
        description: 'Enforce hourly task throughput limit',
        condition: 'tasksThisHour >= config.maxTasksPerHour',
        action: 'deny',
        riskLevel: 'medium',
      },
      {
        id: 'low-confidence-escalation',
        description: 'Escalate tasks below confidence threshold',
        condition: 'confidence < config.escalationThresholdConfidence',
        action: 'require_approval',
        riskLevel: 'medium',
      },
      {
        id: 'data-scope-violation',
        description: 'Block access outside permitted data scopes',
        condition: '!config.dataAccessScopes.includes(scope)',
        action: 'deny',
        riskLevel: 'critical',
      },
    ],
  };

  return [...base, ...familyPolicies[family]];
}

// ─── Re-exports ────────────────────────────────────────────────

export * from './safety.js';
export * from './trading/indicators.js';
export * from './trading/engine.js';
export * from './trading/adapters.js';
export * from './store/strategies.js';
export * from './store/engine.js';
export * from './store/adapters.js';
export * from './social/strategies.js';
export * from './social/engine.js';
export * from './social/adapters.js';
export * from './workforce/strategies.js';
export * from './workforce/engine.js';
export * from './workforce/adapters.js';
export * from './workforce/team.js';
export * from './workforce/learning.js';
export * from './workforce/safety.js';
export * from './workforce/intelligence.js';
