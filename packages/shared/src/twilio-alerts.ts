// ─── Twilio Alerts ────────────────────────────────────────────
//
// Real-time SMS and WhatsApp alerting for critical bot events.
// Complements existing push notifications with carrier-grade delivery.
//
// Events: circuit breaker trips, high-risk approvals, budget warnings,
// trade executions above threshold, bot errors.
//
// Security: Phone numbers are tenant-scoped and stored encrypted.
// Message bodies never contain credentials or full account details.

import type { BotFamily } from './index.js';

// ─── Types ────────────────────────────────────────────────────

export type AlertChannel = 'sms' | 'whatsapp';
export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';

export type AlertEventType =
  | 'circuit_breaker_tripped'
  | 'approval_required'
  | 'budget_warning'
  | 'trade_executed'
  | 'bot_error'
  | 'daily_summary'
  | 'position_liquidation'
  | 'liquidation_risk';

export interface AlertConfig {
  /** Twilio Account SID */
  accountSid: string;
  /** Twilio Auth Token */
  authToken: string;
  /** Twilio phone number (SMS sender) */
  fromNumber: string;
  /** Twilio WhatsApp number (e.g. "whatsapp:+14155238886") */
  fromWhatsApp?: string;
}

export interface AlertRecipient {
  id: string;
  tenantId: string;
  userId: string;
  phone: string;         // E.164 format: +1234567890
  channels: AlertChannel[];
  /** Event types this recipient wants to receive */
  eventTypes: AlertEventType[];
  /** Minimum priority threshold */
  minPriority: AlertPriority;
  enabled: boolean;
  createdAt: number;
}

export interface AlertMessage {
  to: string;
  channel: AlertChannel;
  body: string;
  priority: AlertPriority;
  eventType: AlertEventType;
  metadata?: {
    botId?: string;
    family?: BotFamily;
    tenantId?: string;
  };
}

export interface AlertResult {
  success: boolean;
  messageSid?: string;
  channel: AlertChannel;
  error?: string;
}

// ─── Priority Mapping ─────────────────────────────────────────

const PRIORITY_RANK: Record<AlertPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const EVENT_PRIORITY: Record<AlertEventType, AlertPriority> = {
  circuit_breaker_tripped: 'critical',
  position_liquidation: 'critical',
  liquidation_risk: 'critical',
  approval_required: 'high',
  budget_warning: 'high',
  bot_error: 'high',
  trade_executed: 'medium',
  daily_summary: 'low',
};

export function getEventPriority(eventType: AlertEventType): AlertPriority {
  return EVENT_PRIORITY[eventType] ?? 'medium';
}

export function shouldAlert(
  recipient: AlertRecipient,
  eventType: AlertEventType,
  priority: AlertPriority,
): boolean {
  if (!recipient.enabled) return false;
  if (!recipient.eventTypes.includes(eventType)) return false;
  return PRIORITY_RANK[priority] >= PRIORITY_RANK[recipient.minPriority];
}

// ─── Message Builders ─────────────────────────────────────────

function sanitizeAlertText(text: string, maxLen: number = 160): string {
  // Strip anything that could be used for SMS injection
  return text.replace(/[^\w\s$.,!?%@#:;/\-()[\]{}+=']/g, '').slice(0, maxLen);
}

export function buildCircuitBreakerAlert(
  botName: string,
  reason: string,
  family: BotFamily,
): string {
  return `🚨 CIRCUIT BREAKER — ${sanitizeAlertText(botName, 30)} (${family})\n${sanitizeAlertText(reason, 100)}\nAction required: beastbots.com/safety`;
}

export function buildApprovalAlert(
  botName: string,
  action: string,
  riskLevel: string,
): string {
  return `⚠️ APPROVAL NEEDED — ${sanitizeAlertText(botName, 30)}\nAction: ${sanitizeAlertText(action, 60)}\nRisk: ${sanitizeAlertText(riskLevel, 10)}\nReview: beastbots.com/safety`;
}

export function buildBudgetAlert(
  botName: string,
  spentUsd: number,
  limitUsd: number,
  percentUsed: number,
): string {
  return `💰 BUDGET WARNING — ${sanitizeAlertText(botName, 30)}\nSpent: $${spentUsd.toFixed(2)} / $${limitUsd.toFixed(2)} (${percentUsed.toFixed(0)}%)\nReview: beastbots.com/bots`;
}

export function buildTradeAlert(
  botName: string,
  side: string,
  symbol: string,
  amountUsd: number,
  pnlUsd?: number,
): string {
  const pnlStr = pnlUsd !== undefined ? ` | P&L: ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)}` : '';
  return `📊 TRADE — ${sanitizeAlertText(botName, 30)}\n${side.toUpperCase()} ${sanitizeAlertText(symbol, 20)} $${amountUsd.toFixed(2)}${pnlStr}`;
}

export function buildBotErrorAlert(
  botName: string,
  error: string,
  family: BotFamily,
): string {
  return `❌ BOT ERROR — ${sanitizeAlertText(botName, 30)} (${family})\n${sanitizeAlertText(error, 100)}\nCheck: beastbots.com/bots`;
}

export function buildLiquidationAlert(
  botName: string,
  symbol: string,
  lossUsd: number,
): string {
  return `🔴 LIQUIDATION — ${sanitizeAlertText(botName, 30)}\n${sanitizeAlertText(symbol, 20)} | Loss: -$${Math.abs(lossUsd).toFixed(2)}\nImmediate review required`;
}

export function buildDailySummary(
  totalBots: number,
  activeBots: number,
  totalPnlUsd: number,
  tradesExecuted: number,
  alertsTriggered: number,
): string {
  const pnlStr = totalPnlUsd >= 0 ? `+$${totalPnlUsd.toFixed(2)}` : `-$${Math.abs(totalPnlUsd).toFixed(2)}`;
  return `📋 DAILY SUMMARY\nBots: ${activeBots}/${totalBots} active\nP&L: ${pnlStr}\nTrades: ${tradesExecuted}\nAlerts: ${alertsTriggered}`;
}

// ─── Twilio SMS/WhatsApp Sender ──────────────────────────────

/**
 * Sends an alert message via Twilio SMS or WhatsApp.
 * Handles both channels with proper formatting.
 */
export async function sendTwilioAlert(
  config: AlertConfig,
  message: AlertMessage,
): Promise<AlertResult> {
  const channel = message.channel;

  // Determine sender/recipient format
  const from = channel === 'whatsapp'
    ? (config.fromWhatsApp ?? `whatsapp:${config.fromNumber}`)
    : config.fromNumber;
  const to = channel === 'whatsapp'
    ? `whatsapp:${message.to}`
    : message.to;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`;

    const body = new URLSearchParams({
      From: from,
      To: to,
      Body: message.body,
    });

    const authHeader = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, channel, error: `Twilio ${res.status}: ${errBody.slice(0, 200)}` };
    }

    const data = await res.json() as { sid?: string };
    return { success: true, messageSid: data.sid, channel };
  } catch (err) {
    return { success: false, channel, error: String(err) };
  }
}

// ─── Batch Alert Dispatcher ──────────────────────────────────

/**
 * Dispatches an alert to all matching recipients across all their channels.
 */
export async function dispatchAlert(
  config: AlertConfig,
  recipients: AlertRecipient[],
  eventType: AlertEventType,
  body: string,
  metadata?: AlertMessage['metadata'],
): Promise<AlertResult[]> {
  const priority = getEventPriority(eventType);
  const results: AlertResult[] = [];

  for (const recipient of recipients) {
    if (!shouldAlert(recipient, eventType, priority)) continue;

    for (const channel of recipient.channels) {
      const result = await sendTwilioAlert(config, {
        to: recipient.phone,
        channel,
        body,
        priority,
        eventType,
        metadata,
      });
      results.push(result);
    }
  }

  return results;
}

// ─── Get Config from Env ──────────────────────────────────────

export function getTwilioConfig(): AlertConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) return null;
  return {
    accountSid,
    authToken,
    fromNumber,
    fromWhatsApp: process.env.TWILIO_WHATSAPP_NUMBER,
  };
}
