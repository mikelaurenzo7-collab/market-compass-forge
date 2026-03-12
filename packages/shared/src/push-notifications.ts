// ─── Push Notification System ─────────────────────────────────
//
// Web Push (VAPID) based notifications for mobile + desktop browsers.
// Handles subscription management, payload construction, and delivery.
//
// Security: VAPID keys are server-side only. Subscriptions are tenant-scoped.
// No PII in push payloads — generic action descriptions only.

import type { BotFamily } from './index';

// ─── Types ────────────────────────────────────────────────────

export type PushEventType =
  | 'approval_required'
  | 'trade_executed'
  | 'circuit_breaker_tripped'
  | 'budget_warning'
  | 'bot_error'
  | 'daily_digest';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag: string;           // dedup key for notification grouping
  data: {
    type: PushEventType;
    family?: BotFamily;
    url?: string;         // deep link into dashboard
    botId?: string;
    timestamp: number;
  };
}

export interface PushSubscriptionRecord {
  id: string;
  tenantId: string;
  userId: string;
  /** The browser's PushSubscription serialized (endpoint + keys) */
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  /** User agent for display in settings */
  userAgent: string;
  createdAt: number;
  lastUsedAt: number;
}

export interface PushPreferences {
  approvalRequired: boolean;
  tradeExecuted: boolean;
  circuitBreakerTripped: boolean;
  budgetWarning: boolean;
  botError: boolean;
  dailyDigest: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────

export function createDefaultPushPreferences(): PushPreferences {
  return {
    approvalRequired: true,
    tradeExecuted: true,
    circuitBreakerTripped: true,
    budgetWarning: true,
    botError: true,
    dailyDigest: false,
  };
}

// ─── Payload Builders ─────────────────────────────────────────

/** Sanitize user-controlled strings for safe push notification display */
function sanitize(input: string, maxLen = 60): string {
  return input.slice(0, maxLen).replace(/[^\w\s.,!?@#$%&*()\-/]/g, '');
}

export function buildApprovalPayload(
  botName: string,
  action: string,
  riskLevel: string,
): PushPayload {
  return {
    title: '🔒 Approval Required',
    body: `${sanitize(botName)}: "${sanitize(action)}" needs your approval (${riskLevel} risk)`,
    tag: `approval-${Date.now()}`,
    data: {
      type: 'approval_required',
      url: '/safety',
      timestamp: Date.now(),
    },
  };
}

export function buildTradePayload(
  botName: string,
  symbol: string,
  side: string,
  price: number,
): PushPayload {
  return {
    title: `📈 Trade ${side.toUpperCase()}`,
    body: `${sanitize(botName)}: ${sanitize(side)} ${sanitize(symbol)} @ $${price.toFixed(2)}`,
    tag: `trade-${symbol}-${Date.now()}`,
    data: {
      type: 'trade_executed',
      family: 'trading',
      url: '/bots?family=trading',
      timestamp: Date.now(),
    },
  };
}

export function buildCircuitBreakerPayload(
  botName: string,
  family: BotFamily,
): PushPayload {
  return {
    title: '⚠️ Circuit Breaker Tripped',
    body: `${sanitize(botName)} has been paused — too many consecutive errors`,
    tag: `cb-${family}-${Date.now()}`,
    data: {
      type: 'circuit_breaker_tripped',
      family,
      url: '/safety',
      timestamp: Date.now(),
    },
  };
}

export function buildBudgetWarningPayload(
  botName: string,
  percentUsed: number,
  family: BotFamily,
): PushPayload {
  return {
    title: '💰 Budget Warning',
    body: `${sanitize(botName)} has used ${percentUsed}% of daily budget`,
    tag: `budget-${family}-${Date.now()}`,
    data: {
      type: 'budget_warning',
      family,
      url: '/safety',
      timestamp: Date.now(),
    },
  };
}

export function buildBotErrorPayload(
  botName: string,
  errorMessage: string,
  family: BotFamily,
): PushPayload {
  const safeMsg = sanitize(errorMessage, 80);
  return {
    title: '❌ Bot Error',
    body: `${sanitize(botName)}: ${safeMsg}`,
    tag: `error-${family}-${Date.now()}`,
    data: {
      type: 'bot_error',
      family,
      url: `/bots?family=${family}`,
      timestamp: Date.now(),
    },
  };
}

export function buildDailyDigestPayload(
  totalBots: number,
  activeBots: number,
  pnlUsd: number,
): PushPayload {
  const sign = pnlUsd >= 0 ? '+' : '';
  return {
    title: '📊 Daily Digest',
    body: `${activeBots}/${totalBots} bots active | P&L: ${sign}$${pnlUsd.toFixed(2)}`,
    tag: `digest-${new Date().toISOString().split('T')[0]}`,
    data: {
      type: 'daily_digest',
      url: '/analytics',
      timestamp: Date.now(),
    },
  };
}

// ─── Push Delivery ────────────────────────────────────────────

/**
 * Sends a push notification to a browser subscription endpoint.
 * Uses the Web Push protocol with VAPID authentication.
 *
 * In production, this would use the `web-push` npm package.
 * This function provides the interface — the API route wires it to
 * the actual web-push library or a push service.
 */
export interface PushSendResult {
  subscriptionId: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Determines which event types should be sent based on user preferences.
 */
export function shouldSendPush(eventType: PushEventType, prefs: PushPreferences): boolean {
  switch (eventType) {
    case 'approval_required': return prefs.approvalRequired;
    case 'trade_executed': return prefs.tradeExecuted;
    case 'circuit_breaker_tripped': return prefs.circuitBreakerTripped;
    case 'budget_warning': return prefs.budgetWarning;
    case 'bot_error': return prefs.botError;
    case 'daily_digest': return prefs.dailyDigest;
    default: return false;
  }
}
