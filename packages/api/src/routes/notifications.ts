/**
 * Notification preferences and email dispatch.
 *
 * Integrates with Resend for transactional email (password reset, trade alerts).
 * Users can configure per-family notification preferences.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { verifyAuthHeader } from '../lib/auth.js';
import { getDb } from '../lib/db.js';

export const notificationsRouter = new Hono();

// ─── Email Service ────────────────────────────────────────────

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY not set — cannot send:', payload.subject);
    return { success: false, error: 'Email service not configured (RESEND_API_KEY missing)' };
  }

  const fromAddress = process.env.EMAIL_FROM ?? 'BeastBots <noreply@beastbots.ai>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Email] Send failed:', text);
    return { success: false, error: `Email provider error: ${res.status}` };
  }

  const data = await res.json() as { id?: string };
  return { success: true, messageId: data.id };
}

// ─── Email Templates ──────────────────────────────────────────

export function passwordResetEmail(resetUrl: string): EmailPayload & { subject: string; html: string } {
  return {
    to: '', // filled by caller
    subject: 'Reset your BeastBots password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #10b981; font-size: 24px; margin-bottom: 16px;">Password Reset</h1>
        <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6;">
          You requested a password reset for your BeastBots account. Click the button below to set a new password.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 24px 0;">
          Reset Password
        </a>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          This link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">BeastBots — Deploy AI-powered autonomous bots</p>
      </div>
    `,
  };
}

export function tradeAlertEmail(botName: string, action: string, symbol: string, details: string): EmailPayload & { subject: string; html: string } {
  return {
    to: '',
    subject: `[BeastBots] ${botName}: ${action} ${symbol}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #10b981; font-size: 20px; margin-bottom: 16px;">Trade Alert: ${botName}</h1>
        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #e2e8f0; font-size: 16px; margin: 0;">
            <strong>${action.toUpperCase()}</strong> ${symbol}
          </p>
          <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">${details}</p>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">
          <a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/bots" style="color: #10b981;">View your bots →</a>
        </p>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">BeastBots — Deploy AI-powered autonomous bots</p>
      </div>
    `,
  };
}

export function dailyDigestEmail(summary: { totalBots: number; activeBots: number; totalPnl: number; successRate: number; highlights: string[] }): EmailPayload & { subject: string; html: string } {
  const pnlColor = summary.totalPnl >= 0 ? '#10b981' : '#ef4444';
  const pnlSign = summary.totalPnl >= 0 ? '+' : '';
  return {
    to: '',
    subject: `[BeastBots] Daily Digest — ${pnlSign}$${summary.totalPnl.toFixed(2)}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #10b981; font-size: 20px; margin-bottom: 16px;">Daily Bot Digest</h1>
        <div style="display: flex; gap: 16px; margin: 16px 0;">
          <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; flex: 1; text-align: center;">
            <div style="color: #94a3b8; font-size: 12px;">Active Bots</div>
            <div style="color: #e2e8f0; font-size: 24px; font-weight: 700;">${summary.activeBots}/${summary.totalBots}</div>
          </div>
          <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; flex: 1; text-align: center;">
            <div style="color: #94a3b8; font-size: 12px;">P&amp;L</div>
            <div style="color: ${pnlColor}; font-size: 24px; font-weight: 700;">${pnlSign}$${summary.totalPnl.toFixed(2)}</div>
          </div>
          <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; flex: 1; text-align: center;">
            <div style="color: #94a3b8; font-size: 12px;">Success Rate</div>
            <div style="color: #e2e8f0; font-size: 24px; font-weight: 700;">${summary.successRate.toFixed(0)}%</div>
          </div>
        </div>
        ${summary.highlights.length > 0 ? `
        <h3 style="color: #e2e8f0; font-size: 14px; margin-top: 24px;">Highlights</h3>
        <ul style="color: #94a3b8; font-size: 14px; padding-left: 20px;">
          ${summary.highlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
        ` : ''}
        <p style="color: #94a3b8; font-size: 14px; margin-top: 24px;">
          <a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/analytics" style="color: #10b981;">View full analytics →</a>
        </p>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">BeastBots — Deploy AI-powered autonomous bots</p>
      </div>
    `,
  };
}

// ─── Notification Preferences ─────────────────────────────────

notificationsRouter.get('/preferences', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const prefs = db.prepare(
    'SELECT * FROM notification_preferences WHERE tenant_id = ?'
  ).get(auth.tenantId) as { preferences: string } | undefined;

  if (!prefs) {
    // Return defaults
    return c.json({
      success: true,
      data: {
        emailTradeAlerts: true,
        emailDailyDigest: true,
        emailSecurityAlerts: true,
        emailWeeklyReport: false,
        tradeAlertMinConfidence: 80,
        tradeAlertMinPnlUsd: 10,
      },
    });
  }

  return c.json({ success: true, data: JSON.parse(prefs.preferences) });
});

const notificationPrefsSchema = z.object({
  emailTradeAlerts: z.boolean().optional(),
  emailDailyDigest: z.boolean().optional(),
  emailSecurityAlerts: z.boolean().optional(),
  emailWeeklyReport: z.boolean().optional(),
  tradeAlertMinConfidence: z.number().min(0).max(100).optional(),
  tradeAlertMinPnlUsd: z.number().min(0).max(100_000).optional(),
}).strict();

notificationsRouter.put('/preferences', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = notificationPrefsSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues }, 400);

  const db = getDb();

  db.prepare(
    `INSERT INTO notification_preferences (tenant_id, preferences, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(tenant_id) DO UPDATE SET preferences = ?, updated_at = ?`
  ).run(auth.tenantId, JSON.stringify(parsed.data), Date.now(), JSON.stringify(parsed.data), Date.now());

  return c.json({ success: true });
});
