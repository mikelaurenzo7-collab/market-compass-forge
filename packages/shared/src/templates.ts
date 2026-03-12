/**
 * Bot Template Library — pre-configured, one-click-deploy strategy templates.
 *
 * This is a core competitive differentiator: no other platform offers
 * curated templates across trading, ecommerce, social, and workforce
 * that a user can deploy in under 60 seconds.
 */

import type { BotFamily, TradingPlatform, StorePlatform, SocialPlatform } from './index';

export interface BotTemplate {
  id: string;
  name: string;
  family: BotFamily;
  platforms: string[];
  strategy: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  riskLevel: 'low' | 'medium' | 'high';
  estimatedSetupMinutes: number;
  tags: string[];
  config: Record<string, unknown>;
  /** Markdown description for the template detail view */
  longDescription: string;
  /** Whether the template starts in paper/demo mode by default */
  defaultPaperMode: boolean;
}

// ─── Trading Templates ────────────────────────────────────────

const tradingTemplates: BotTemplate[] = [
  {
    id: 'btc-dca-weekly',
    name: 'Bitcoin Weekly DCA',
    family: 'trading',
    platforms: ['coinbase', 'binance', 'alpaca'],
    strategy: 'dca',
    description: 'Automatically buy Bitcoin every week — the simplest proven strategy for long-term accumulation.',
    difficulty: 'beginner',
    riskLevel: 'low',
    estimatedSetupMinutes: 2,
    tags: ['bitcoin', 'dca', 'long-term', 'passive'],
    defaultPaperMode: true,
    longDescription: `Dollar-cost averaging (DCA) into Bitcoin is the most battle-tested strategy for retail investors. This template buys a fixed USD amount of BTC every week, regardless of price — reducing the impact of volatility and removing emotion from the equation.\n\n**How it works:**\n- Buys once per week (configurable interval)\n- Fixed $50 USD per buy (configurable)\n- No stop-loss needed — long-term hold strategy\n- Safety model enforces daily spend limit\n\n**Best for:** First-time crypto investors who want hands-off exposure.`,
    config: {
      symbols: ['BTC-USD'],
      strategy: 'dca',
      maxPositionSizeUsd: 50,
      maxDailyLossUsd: 100,
      maxOpenPositions: 1,
      stopLossPercent: 0.15,
      takeProfitPercent: 0.5,
      cooldownAfterLossMs: 3_600_000,
      paperTrading: true,
      autonomyLevel: 'auto',
    },
  },
  {
    id: 'eth-momentum-scalper',
    name: 'Ethereum Momentum Scalper',
    family: 'trading',
    platforms: ['coinbase', 'binance'],
    strategy: 'momentum',
    description: 'Ride short-term ETH momentum swings using RSI, MACD, and volume confirmation.',
    difficulty: 'intermediate',
    riskLevel: 'medium',
    estimatedSetupMinutes: 3,
    tags: ['ethereum', 'momentum', 'short-term', 'active'],
    defaultPaperMode: true,
    longDescription: `This template catches ETH momentum moves by combining RSI divergence, MACD crossovers, and volume spikes. It enters on strong signals (>65% confidence) and uses tight stop-losses to protect capital.\n\n**Indicators used:**\n- RSI (14-period) for overbought/oversold detection\n- MACD (12/26/9) for trend direction\n- VWAP for institutional price levels\n- Volume spike detection for confirmation\n\n**Risk controls:**\n- 3% stop-loss per trade\n- 8% take-profit target\n- Max 3 open positions\n- Trailing stop at 2%`,
    config: {
      symbols: ['ETH-USD'],
      strategy: 'momentum',
      maxPositionSizeUsd: 200,
      maxDailyLossUsd: 100,
      maxOpenPositions: 3,
      stopLossPercent: 0.03,
      takeProfitPercent: 0.08,
      trailingStopPercent: 0.02,
      cooldownAfterLossMs: 300_000,
      paperTrading: true,
      autonomyLevel: 'auto',
      multiTimeframeConfirmation: true,
    },
  },
  {
    id: 'stock-mean-reversion',
    name: 'US Stocks Mean Reversion',
    family: 'trading',
    platforms: ['alpaca'],
    strategy: 'mean_reversion',
    description: 'Buy oversold US stocks and sell when they revert to the mean. Market hours only.',
    difficulty: 'intermediate',
    riskLevel: 'medium',
    estimatedSetupMinutes: 3,
    tags: ['stocks', 'mean-reversion', 'equities', 'SPY'],
    defaultPaperMode: true,
    longDescription: `Mean reversion exploits the tendency of stocks to return to their average price after extreme moves. This template watches for Bollinger Band breakouts and low ADX readings to identify range-bound conditions.\n\n**Strategy logic:**\n- Buy when price touches lower Bollinger Band (2 std dev)\n- Sell when price returns to SMA20 or hits upper band\n- ADX filter: only trade when ADX < 25 (sideways market)\n- Automatic market hours enforcement (9:30 AM - 4:00 PM ET)\n\n**Best for:** Traders who believe overextended moves tend to correct.`,
    config: {
      symbols: ['SPY', 'AAPL', 'MSFT'],
      strategy: 'mean_reversion',
      maxPositionSizeUsd: 500,
      maxDailyLossUsd: 200,
      maxOpenPositions: 3,
      stopLossPercent: 0.04,
      takeProfitPercent: 0.06,
      cooldownAfterLossMs: 600_000,
      paperTrading: true,
      autonomyLevel: 'auto',
    },
  },
  {
    id: 'crypto-grid-trader',
    name: 'Crypto Grid Trader',
    family: 'trading',
    platforms: ['coinbase', 'binance'],
    strategy: 'grid',
    description: 'Place buy/sell orders across a price grid — profits from sideways volatility.',
    difficulty: 'advanced',
    riskLevel: 'high',
    estimatedSetupMinutes: 5,
    tags: ['grid', 'range-bound', 'passive-income', 'advanced'],
    defaultPaperMode: true,
    longDescription: `Grid trading places limit orders at regular price intervals, buying low and selling high within a defined range. It profits from sideways volatility — the more the price oscillates, the more trades fill.\n\n**Grid configuration:**\n- 10 grid levels from -5% to +5% around current price\n- Each level holds a small position\n- Auto-rebalances when price moves through levels\n- Works best in consolidation phases\n\n**Warning:** Grid bots can accumulate large positions if price trends strongly in one direction. The safety model enforces position limits.`,
    config: {
      symbols: ['BTC-USD'],
      strategy: 'grid',
      maxPositionSizeUsd: 100,
      maxDailyLossUsd: 300,
      maxOpenPositions: 10,
      stopLossPercent: 0.1,
      takeProfitPercent: 0.05,
      cooldownAfterLossMs: 60_000,
      paperTrading: true,
      autonomyLevel: 'auto',
      gridLevels: [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5],
    },
  },
  {
    id: 'prediction-market-edge',
    name: 'Prediction Market Edge Finder',
    family: 'trading',
    platforms: ['kalshi', 'polymarket'],
    strategy: 'event_probability',
    description: 'Find mispriced prediction market contracts by comparing your estimated probability to market odds.',
    difficulty: 'advanced',
    riskLevel: 'high',
    estimatedSetupMinutes: 5,
    tags: ['prediction-markets', 'events', 'probability', 'kalshi'],
    defaultPaperMode: true,
    longDescription: `This template scans prediction market contracts for edge — situations where your estimated probability of an event differs significantly from the market price.\n\n**How it works:**\n- Monitors event contracts on Kalshi or Polymarket\n- Compares current market price to your probability estimate\n- Buys when market underprices an event (>10% edge)\n- Sells when market overprices (>10% edge)\n- Uses Kelly criterion for optimal position sizing\n\n**Best for:** News-informed traders who can form independent probability estimates.`,
    config: {
      symbols: [],
      strategy: 'event_probability',
      maxPositionSizeUsd: 50,
      maxDailyLossUsd: 100,
      maxOpenPositions: 5,
      stopLossPercent: 0.2,
      takeProfitPercent: 0.3,
      cooldownAfterLossMs: 300_000,
      paperTrading: true,
      autonomyLevel: 'suggest',
      arbitrageThresholdPercent: 0.1,
    },
  },
];

// ─── Store Templates ──────────────────────────────────────────

const storeTemplates: BotTemplate[] = [
  {
    id: 'shopify-dynamic-pricing',
    name: 'Shopify Smart Pricer',
    family: 'store',
    platforms: ['shopify'],
    strategy: 'dynamic_pricing',
    description: 'Automatically adjust product prices based on demand, inventory, and competitor activity.',
    difficulty: 'beginner',
    riskLevel: 'low',
    estimatedSetupMinutes: 3,
    tags: ['shopify', 'pricing', 'revenue', 'automation'],
    defaultPaperMode: false,
    longDescription: `Dynamic pricing maximizes revenue by adjusting prices in real-time based on demand signals. This template monitors your Shopify store and applies intelligent pricing rules.\n\n**Pricing signals used:**\n- Inventory levels (raise prices when stock is low)\n- Sales velocity (detect trending products)\n- Competitor pricing (stay competitive)\n- Time-of-day / day-of-week patterns\n\n**Safety guardrails:**\n- Min/max price bounds per product\n- Max 10% price change per adjustment\n- All changes logged in audit trail\n- Rollback capability`,
    config: {
      strategies: ['dynamic_pricing'],
      monitorIntervalMinutes: 15,
      maxPriceChangePercent: 10,
      minMarginPercent: 15,
      competitorMonitoring: true,
    },
  },
  {
    id: 'multi-store-inventory-sync',
    name: 'Multi-Marketplace Inventory Sync',
    family: 'store',
    platforms: ['shopify', 'amazon', 'etsy', 'ebay'],
    strategy: 'cross_platform_sync',
    description: 'Keep inventory synced across all your marketplaces — prevent oversells automatically.',
    difficulty: 'beginner',
    riskLevel: 'low',
    estimatedSetupMinutes: 5,
    tags: ['inventory', 'sync', 'multi-channel', 'oversell-prevention'],
    defaultPaperMode: false,
    longDescription: `Selling on multiple marketplaces means inventory can go out of sync, leading to oversells and unhappy customers. This template keeps stock counts synchronized in real-time.\n\n**How it works:**\n- Monitors inventory across all connected stores\n- When a sale occurs on one platform, updates all others\n- Prevents overselling with buffer stock rules\n- Alerts when products hit reorder points\n\n**Best for:** Multi-channel sellers who want peace of mind.`,
    config: {
      strategies: ['cross_platform_sync', 'inventory_forecast'],
      syncIntervalMinutes: 5,
      bufferStockPercent: 10,
      reorderAlertThreshold: 5,
    },
  },
  {
    id: 'competitor-price-tracker',
    name: 'Competitor Price Tracker',
    family: 'store',
    platforms: ['shopify', 'amazon', 'etsy'],
    strategy: 'competitor_monitoring',
    description: 'Monitor competitor prices and get alerts when they undercut you — or auto-match.',
    difficulty: 'intermediate',
    riskLevel: 'medium',
    estimatedSetupMinutes: 5,
    tags: ['competitor', 'pricing', 'alerts', 'competitive-intelligence'],
    defaultPaperMode: false,
    longDescription: `Know the moment a competitor changes their price. This template continuously monitors competitor listings and alerts you — or automatically adjusts your price to stay competitive.\n\n**Modes:**\n- **Alert mode:** Get notified when competitor prices change\n- **Auto-match:** Automatically match or beat competitor prices\n- **Floor protection:** Never go below your minimum margin\n\n**Best for:** Competitive marketplaces where price is a key differentiator.`,
    config: {
      strategies: ['competitor_monitoring', 'dynamic_pricing'],
      monitorIntervalMinutes: 30,
      autoMatchEnabled: false,
      minMarginPercent: 20,
      undercutPercent: 2,
    },
  },
];

// ─── Social Templates ─────────────────────────────────────────

const socialTemplates: BotTemplate[] = [
  {
    id: 'twitter-growth-engine',
    name: 'X/Twitter Growth Engine',
    family: 'social',
    platforms: ['x'],
    strategy: 'engagement_automation',
    description: 'Grow your X presence with automated engagement, optimal posting times, and trend surfing.',
    difficulty: 'beginner',
    riskLevel: 'low',
    estimatedSetupMinutes: 3,
    tags: ['twitter', 'growth', 'engagement', 'followers'],
    defaultPaperMode: false,
    longDescription: `This template combines engagement automation with content optimization to grow your X/Twitter following organically.\n\n**What it does:**\n- Posts at your audience's peak activity hours\n- Detects trending topics in your niche\n- Optimizes hashtag usage for maximum reach\n- Tracks engagement metrics and adjusts strategy\n\n**Growth tactics:**\n- Reply engagement in your niche (builds visibility)\n- Thread creation for maximum impressions\n- Hashtag rotation to avoid shadowbanning\n- Best-time posting based on your audience timezone`,
    config: {
      strategies: ['engagement_automation', 'hashtag_optimization', 'content_calendar'],
      maxPostsPerDay: 5,
      engagementBoostEnabled: true,
      trendSurfingEnabled: true,
      optimalTimingEnabled: true,
    },
  },
  {
    id: 'multi-platform-content-scheduler',
    name: 'Cross-Platform Content Scheduler',
    family: 'social',
    platforms: ['x', 'instagram', 'linkedin', 'tiktok', 'facebook'],
    strategy: 'content_calendar',
    description: 'Schedule and auto-adapt content across all social platforms from one command center.',
    difficulty: 'beginner',
    riskLevel: 'low',
    estimatedSetupMinutes: 5,
    tags: ['scheduling', 'cross-platform', 'content', 'calendar'],
    defaultPaperMode: false,
    longDescription: `Write once, publish everywhere — but optimized for each platform. This template takes your content and automatically adapts it for each platform's format, audience, and best practices.\n\n**Platform optimizations:**\n- **X:** Thread formatting, 280-char limit, hashtags\n- **Instagram:** Visual-first, carousel suggestions, Stories timing\n- **LinkedIn:** Professional tone, longer form, industry hashtags\n- **TikTok:** Hook-first, trending sounds, peak hours\n- **Facebook:** Group sharing, engagement bait removal, link formatting\n\n**Best for:** Content creators and brands managing 3+ social platforms.`,
    config: {
      strategies: ['content_calendar', 'cross_post_optimization'],
      maxPostsPerDay: 3,
      platformAdaptation: true,
      optimalTimingEnabled: true,
    },
  },
  {
    id: 'brand-sentiment-monitor',
    name: 'Brand Sentiment Monitor',
    family: 'social',
    platforms: ['x', 'instagram', 'facebook', 'linkedin'],
    strategy: 'audience_analytics',
    description: 'Track what people say about your brand and get alerts on sentiment shifts.',
    difficulty: 'intermediate',
    riskLevel: 'low',
    estimatedSetupMinutes: 4,
    tags: ['sentiment', 'brand', 'monitoring', 'reputation'],
    defaultPaperMode: false,
    longDescription: `Know the moment sentiment shifts around your brand. This template monitors mentions, comments, and engagement patterns to detect positive or negative trends.\n\n**Monitoring:**\n- Track brand mentions across platforms\n- Sentiment scoring (positive/neutral/negative)\n- Alert on sudden sentiment drops\n- Weekly sentiment reports\n\n**Best for:** Brands that need to protect their reputation online.`,
    config: {
      strategies: ['audience_analytics', 'trend_detection'],
      mentionTrackingEnabled: true,
      sentimentAlertThreshold: -0.3,
      weeklyReportEnabled: true,
    },
  },
];

// ─── Workforce Templates ──────────────────────────────────────

const workforceTemplates: BotTemplate[] = [
  {
    id: 'support-ticket-triage',
    name: 'Support Ticket Auto-Triage',
    family: 'workforce',
    platforms: ['slack', 'teams', 'jira', 'salesforce'],
    strategy: 'task_triage',
    description: 'Auto-prioritize and route support tickets based on urgency, topic, and SLA timers.',
    difficulty: 'beginner',
    riskLevel: 'low',
    estimatedSetupMinutes: 5,
    tags: ['support', 'tickets', 'triage', 'SLA', 'automation'],
    defaultPaperMode: false,
    longDescription: `Stop manually sorting through support tickets. This template automatically analyzes incoming tickets, assigns priority levels, routes to the right team member, and escalates when SLAs are at risk.\n\n**Triage logic:**\n- Keyword/topic detection for routing\n- Urgency scoring based on language analysis\n- SLA timer tracking with escalation\n- VIP customer fast-track detection\n\n**Best for:** Support teams handling 50+ tickets/day.`,
    config: {
      category: 'customer_support',
      strategies: ['task_triage', 'escalation_routing'],
      autoAssignEnabled: true,
      slaAlertMinutes: 30,
      escalationEnabled: true,
      vipDetectionEnabled: true,
    },
  },
  {
    id: 'daily-standup-reporter',
    name: 'Daily Standup Reporter',
    family: 'workforce',
    platforms: ['slack', 'jira', 'notion', 'github'],
    strategy: 'report_generation',
    description: 'Automatically generate daily standup reports from Jira, GitHub, and Slack activity.',
    difficulty: 'beginner',
    riskLevel: 'low',
    estimatedSetupMinutes: 3,
    tags: ['standup', 'reports', 'daily', 'automation', 'engineering'],
    defaultPaperMode: false,
    longDescription: `Replace manual standup updates with automatic reports generated from your team's actual activity.\n\n**Data sources:**\n- Jira: tickets moved, created, resolved\n- GitHub: PRs opened, merged, commits pushed\n- Slack: key discussion summaries\n- Notion: docs created or updated\n\n**Output:**\n- Formatted daily summary posted to Slack\n- Highlights blockers automatically\n- Tracks velocity trends over time\n\n**Best for:** Engineering teams tired of manual status updates.`,
    config: {
      category: 'reporting',
      strategies: ['report_generation'],
      reportTime: '09:00',
      reportTimezone: 'America/New_York',
      includeBlockers: true,
      includeVelocity: true,
    },
  },
  {
    id: 'new-hire-onboarding',
    name: 'New Hire Onboarding Automation',
    family: 'workforce',
    platforms: ['slack', 'notion', 'jira', 'gmail'],
    strategy: 'onboarding_automation',
    description: 'Automate new hire setup — Slack invites, doc sharing, task creation, and welcome messages.',
    difficulty: 'intermediate',
    riskLevel: 'low',
    estimatedSetupMinutes: 10,
    tags: ['onboarding', 'HR', 'new-hire', 'automation'],
    defaultPaperMode: false,
    longDescription: `Ensure every new hire gets a consistent, thorough onboarding experience — automatically.\n\n**Automated steps:**\n- Slack channel invites and welcome message\n- Notion docs shared (handbook, policies)\n- Jira onboarding tasks created with due dates\n- Calendar invites for 1:1s and orientations\n- Day 1, Day 7, Day 30 check-in reminders\n\n**Best for:** Growing teams hiring 2+ people per month.`,
    config: {
      category: 'hr',
      strategies: ['onboarding_automation', 'data_sync'],
      day1Tasks: true,
      day7CheckIn: true,
      day30CheckIn: true,
      autoSlackInvite: true,
    },
  },
];

// ─── Template Registry ────────────────────────────────────────

export const BOT_TEMPLATES: BotTemplate[] = [
  ...tradingTemplates,
  ...storeTemplates,
  ...socialTemplates,
  ...workforceTemplates,
];

export function getTemplateById(id: string): BotTemplate | undefined {
  return BOT_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByFamily(family: BotFamily): BotTemplate[] {
  return BOT_TEMPLATES.filter(t => t.family === family);
}

export function getTemplatesByPlatform(platform: string): BotTemplate[] {
  return BOT_TEMPLATES.filter(t => t.platforms.includes(platform));
}

export function getTemplatesByDifficulty(difficulty: BotTemplate['difficulty']): BotTemplate[] {
  return BOT_TEMPLATES.filter(t => t.difficulty === difficulty);
}
