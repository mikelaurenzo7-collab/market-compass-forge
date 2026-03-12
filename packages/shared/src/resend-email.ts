// ─── Resend Transactional Email ───────────────────────────────
//
// Production email delivery for BeastBots:
//  • Trade digests (daily/weekly P&L reports)
//  • Performance reports delivery
//  • Security alerts (new login, API key rotation)
//  • Approval request emails with action links
//  • Circuit breaker / budget cap notifications
//
// Uses Resend API (resend.com) for reliable transactional email.
// Fallback: graceful no-op when RESEND_API_KEY is not set.

import type { BotFamily } from './index';

// ─── Types ────────────────────────────────────────────────────

export interface ResendConfig {
  apiKey: string;
  fromAddress: string;    // e.g. "alerts@beastbots.com"
  fromName: string;       // e.g. "BeastBots"
  replyTo?: string;
}

export type EmailTemplate =
  | 'trade_digest'
  | 'performance_report'
  | 'security_alert'
  | 'approval_request'
  | 'circuit_breaker'
  | 'budget_warning'
  | 'welcome'
  | 'weekly_summary';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TradeDigestData {
  tenantName: string;
  period: 'daily' | 'weekly';
  totalPnlUsd: number;
  tradesExecuted: number;
  winRate: number;
  topPerformer?: { name: string; pnlUsd: number; family: BotFamily };
  worstPerformer?: { name: string; pnlUsd: number; family: BotFamily };
  activeBots: number;
  totalBots: number;
  date: string;
}

export interface PerformanceReportData {
  tenantName: string;
  period: 'weekly' | 'monthly';
  overallGrade: string;
  totalPnlUsd: number;
  benchmarkPercentile: number;
  botGrades: Array<{
    name: string;
    family: BotFamily;
    grade: string;
    pnlUsd: number;
  }>;
  insights: string[];
  date: string;
}

export interface SecurityAlertData {
  tenantName: string;
  alertType: 'new_login' | 'api_key_rotated' | 'mfa_changed' | 'password_changed' | 'suspicious_activity';
  details: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// ─── Email Sender ─────────────────────────────────────────────

export async function sendEmail(
  config: ResendConfig,
  payload: EmailPayload,
): Promise<EmailResult> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromAddress}>`,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: config.replyTo,
        tags: payload.tags,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: `Resend ${res.status}: ${errBody.slice(0, 200)}` };
    }

    const data = await res.json() as { id?: string };
    return { success: true, messageId: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─── HTML Template Engine ─────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body{margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e0e0e5}
  .container{max-width:600px;margin:0 auto;padding:24px}
  .header{text-align:center;padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.08)}
  .header h1{font-size:20px;color:#00ff88;margin:0;letter-spacing:1px}
  .header .subtitle{font-size:12px;color:#888;margin-top:4px}
  .content{padding:24px 0}
  .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:16px}
  .card h2{font-size:16px;margin:0 0 12px;color:#fff}
  .stat-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
  .stat-label{color:#888;font-size:14px}
  .stat-value{font-size:14px;font-weight:600}
  .positive{color:#00ff88}
  .negative{color:#ef4444}
  .neutral{color:#888}
  .grade{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-size:13px}
  .grade-a{background:rgba(0,255,136,0.15);color:#00ff88}
  .grade-b{background:rgba(59,130,246,0.15);color:#3b82f6}
  .grade-c{background:rgba(245,158,11,0.15);color:#f59e0b}
  .grade-d{background:rgba(239,68,68,0.15);color:#ef4444}
  .btn{display:inline-block;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:12px}
  .btn-primary{background:#00ff88;color:#0a0a0f}
  .btn-danger{background:#ef4444;color:#fff}
  .footer{text-align:center;padding:24px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#555}
  .alert-badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600}
  .alert-critical{background:rgba(239,68,68,0.2);color:#ef4444}
  .alert-warning{background:rgba(245,158,11,0.2);color:#f59e0b}
  .alert-info{background:rgba(59,130,246,0.2);color:#3b82f6}
</style>
</head>
<body><div class="container">
<div class="header"><h1>BEASTBOTS</h1><div class="subtitle">Autonomous Bot Intelligence</div></div>
<div class="content">${content}</div>
<div class="footer">BeastBots &mdash; beastbots.com<br>You're receiving this because you have alerts enabled.</div>
</div></body></html>`;
}

// ─── Template Renderers ───────────────────────────────────────

export function renderTradeDigest(data: TradeDigestData): EmailPayload {
  const pnlClass = data.totalPnlUsd >= 0 ? 'positive' : 'negative';
  const pnlStr = data.totalPnlUsd >= 0 ? `+$${data.totalPnlUsd.toFixed(2)}` : `-$${Math.abs(data.totalPnlUsd).toFixed(2)}`;

  let botSection = '';
  if (data.topPerformer) {
    botSection += `<div class="stat-row"><span class="stat-label">🏆 Top Performer</span><span class="stat-value positive">${escapeHtml(data.topPerformer.name)} (+$${data.topPerformer.pnlUsd.toFixed(2)})</span></div>`;
  }
  if (data.worstPerformer) {
    botSection += `<div class="stat-row"><span class="stat-label">📉 Needs Attention</span><span class="stat-value negative">${escapeHtml(data.worstPerformer.name)} (-$${Math.abs(data.worstPerformer.pnlUsd).toFixed(2)})</span></div>`;
  }

  const content = `
    <div class="card">
      <h2>${data.period === 'daily' ? '📊 Daily' : '📊 Weekly'} Trade Digest — ${escapeHtml(data.date)}</h2>
      <div class="stat-row"><span class="stat-label">Total P&L</span><span class="stat-value ${pnlClass}">${pnlStr}</span></div>
      <div class="stat-row"><span class="stat-label">Trades Executed</span><span class="stat-value">${data.tradesExecuted}</span></div>
      <div class="stat-row"><span class="stat-label">Win Rate</span><span class="stat-value">${(data.winRate * 100).toFixed(1)}%</span></div>
      <div class="stat-row"><span class="stat-label">Active Bots</span><span class="stat-value">${data.activeBots} / ${data.totalBots}</span></div>
      ${botSection}
    </div>
    <div style="text-align:center"><a href="https://beastbots.com/analytics" class="btn btn-primary">View Full Analytics →</a></div>`;

  return {
    to: '',
    subject: `${data.period === 'daily' ? 'Daily' : 'Weekly'} Digest: ${pnlStr} | ${data.tradesExecuted} trades — ${data.date}`,
    html: baseTemplate(`${data.period} Trade Digest`, content),
    text: `BeastBots ${data.period} Digest — ${data.date}\nP&L: ${pnlStr}\nTrades: ${data.tradesExecuted}\nWin Rate: ${(data.winRate * 100).toFixed(1)}%\nActive Bots: ${data.activeBots}/${data.totalBots}`,
    tags: [{ name: 'template', value: 'trade_digest' }, { name: 'period', value: data.period }],
  };
}

export function renderPerformanceReport(data: PerformanceReportData): EmailPayload {
  const pnlClass = data.totalPnlUsd >= 0 ? 'positive' : 'negative';
  const pnlStr = data.totalPnlUsd >= 0 ? `+$${data.totalPnlUsd.toFixed(2)}` : `-$${Math.abs(data.totalPnlUsd).toFixed(2)}`;
  const gradeClass = data.overallGrade.startsWith('A') ? 'grade-a' : data.overallGrade.startsWith('B') ? 'grade-b' : data.overallGrade.startsWith('C') ? 'grade-c' : 'grade-d';

  const botRows = data.botGrades.slice(0, 8).map(b => {
    const bGrade = b.grade.startsWith('A') ? 'grade-a' : b.grade.startsWith('B') ? 'grade-b' : b.grade.startsWith('C') ? 'grade-c' : 'grade-d';
    const bPnl = b.pnlUsd >= 0 ? `+$${b.pnlUsd.toFixed(2)}` : `-$${Math.abs(b.pnlUsd).toFixed(2)}`;
    return `<div class="stat-row"><span class="stat-label">${escapeHtml(b.name)} <span class="grade ${bGrade}">${b.grade}</span></span><span class="stat-value ${b.pnlUsd >= 0 ? 'positive' : 'negative'}">${bPnl}</span></div>`;
  }).join('');

  const insightsList = data.insights.slice(0, 5).map(i => `<li style="margin-bottom:6px;color:#ccc;font-size:13px">${escapeHtml(i)}</li>`).join('');

  const content = `
    <div class="card">
      <h2>🏆 ${data.period === 'weekly' ? 'Weekly' : 'Monthly'} Performance Report</h2>
      <div style="text-align:center;padding:16px 0">
        <span class="grade ${gradeClass}" style="font-size:28px;padding:8px 20px">${data.overallGrade}</span>
        <div style="margin-top:8px;color:#888;font-size:13px">Overall Grade • Top ${data.benchmarkPercentile}%</div>
      </div>
      <div class="stat-row"><span class="stat-label">Total P&L</span><span class="stat-value ${pnlClass}">${pnlStr}</span></div>
    </div>
    <div class="card"><h2>Bot Grades</h2>${botRows}</div>
    ${insightsList ? `<div class="card"><h2>💡 Insights</h2><ul style="padding-left:20px;margin:0">${insightsList}</ul></div>` : ''}
    <div style="text-align:center"><a href="https://beastbots.com/performance" class="btn btn-primary">Full Report →</a></div>`;

  return {
    to: '',
    subject: `Performance Report: Grade ${data.overallGrade} | ${pnlStr} — ${data.date}`,
    html: baseTemplate('Performance Report', content),
    text: `BeastBots Performance Report — ${data.date}\nGrade: ${data.overallGrade}\nP&L: ${pnlStr}\nBenchmark: Top ${data.benchmarkPercentile}%`,
    tags: [{ name: 'template', value: 'performance_report' }, { name: 'period', value: data.period }],
  };
}

export function renderSecurityAlert(data: SecurityAlertData): EmailPayload {
  const alertClass = data.alertType === 'suspicious_activity' ? 'alert-critical' : 'alert-warning';
  const alertLabel = data.alertType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const content = `
    <div class="card">
      <h2>🔒 Security Alert</h2>
      <div style="margin-bottom:12px"><span class="alert-badge ${alertClass}">${escapeHtml(alertLabel)}</span></div>
      <p style="color:#ccc;font-size:14px;margin:0 0 12px">${escapeHtml(data.details)}</p>
      ${data.ipAddress ? `<div class="stat-row"><span class="stat-label">IP Address</span><span class="stat-value">${escapeHtml(data.ipAddress)}</span></div>` : ''}
      ${data.userAgent ? `<div class="stat-row"><span class="stat-label">Device</span><span class="stat-value" style="font-size:12px">${escapeHtml(data.userAgent.slice(0, 60))}</span></div>` : ''}
      <div class="stat-row"><span class="stat-label">Time</span><span class="stat-value">${escapeHtml(data.timestamp)}</span></div>
    </div>
    <div style="text-align:center">
      <p style="color:#888;font-size:13px">If this wasn't you, secure your account immediately.</p>
      <a href="https://beastbots.com/settings" class="btn btn-danger">Review Account →</a>
    </div>`;

  return {
    to: '',
    subject: `⚠️ Security Alert: ${alertLabel}`,
    html: baseTemplate('Security Alert', content),
    text: `BeastBots Security Alert\n${alertLabel}\n${data.details}\nTime: ${data.timestamp}`,
    tags: [{ name: 'template', value: 'security_alert' }, { name: 'alert_type', value: data.alertType }],
  };
}

export function renderCircuitBreakerEmail(
  botName: string,
  reason: string,
  family: BotFamily,
  timestamp: string,
): EmailPayload {
  const content = `
    <div class="card">
      <h2>🚨 Circuit Breaker Tripped</h2>
      <div style="margin-bottom:12px"><span class="alert-badge alert-critical">CRITICAL</span></div>
      <div class="stat-row"><span class="stat-label">Bot</span><span class="stat-value">${escapeHtml(botName)}</span></div>
      <div class="stat-row"><span class="stat-label">Family</span><span class="stat-value">${family}</span></div>
      <div class="stat-row"><span class="stat-label">Reason</span><span class="stat-value">${escapeHtml(reason.slice(0, 80))}</span></div>
      <div class="stat-row"><span class="stat-label">Time</span><span class="stat-value">${escapeHtml(timestamp)}</span></div>
    </div>
    <p style="color:#ef4444;font-size:14px;text-align:center">This bot has been automatically paused. Manual review required.</p>
    <div style="text-align:center"><a href="https://beastbots.com/safety" class="btn btn-danger">Review Now →</a></div>`;

  return {
    to: '',
    subject: `🚨 Circuit Breaker: ${botName} paused`,
    html: baseTemplate('Circuit Breaker Alert', content),
    text: `CIRCUIT BREAKER — ${botName} (${family})\nReason: ${reason}\nTime: ${timestamp}\nBot has been automatically paused.`,
    tags: [{ name: 'template', value: 'circuit_breaker' }, { name: 'family', value: family }],
  };
}

export function renderApprovalRequestEmail(
  botName: string,
  action: string,
  riskLevel: string,
  family: BotFamily,
): EmailPayload {
  const content = `
    <div class="card">
      <h2>⚠️ Approval Required</h2>
      <div class="stat-row"><span class="stat-label">Bot</span><span class="stat-value">${escapeHtml(botName)}</span></div>
      <div class="stat-row"><span class="stat-label">Action</span><span class="stat-value">${escapeHtml(action.slice(0, 60))}</span></div>
      <div class="stat-row"><span class="stat-label">Risk Level</span><span class="stat-value">${escapeHtml(riskLevel)}</span></div>
      <div class="stat-row"><span class="stat-label">Family</span><span class="stat-value">${family}</span></div>
    </div>
    <div style="text-align:center"><a href="https://beastbots.com/safety" class="btn btn-primary">Review & Approve →</a></div>`;

  return {
    to: '',
    subject: `Approval needed: ${botName} — ${action}`,
    html: baseTemplate('Approval Request', content),
    text: `APPROVAL NEEDED — ${botName}\nAction: ${action}\nRisk: ${riskLevel}\nReview at beastbots.com/safety`,
    tags: [{ name: 'template', value: 'approval_request' }, { name: 'family', value: family }],
  };
}

// ─── Config from Env ──────────────────────────────────────────

export function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    fromAddress: process.env.RESEND_FROM_ADDRESS ?? 'alerts@beastbots.com',
    fromName: process.env.RESEND_FROM_NAME ?? 'BeastBots',
    replyTo: process.env.RESEND_REPLY_TO,
  };
}
