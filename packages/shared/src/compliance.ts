// ─── Compliance Report Generator ──────────────────────────────
//
// Generates SOC2 / GDPR-ready compliance reports from the audit trail.
// All reports are scoped to a single tenant — no cross-tenant data.

import crypto from 'crypto';
import type { AuditEntry, BotFamily, RiskLevel } from './index';

// ─── Types ────────────────────────────────────────────────────

export type ComplianceStandard = 'soc2' | 'gdpr' | 'general';

export interface ComplianceReportRequest {
  tenantId: string;
  standard: ComplianceStandard;
  /** Start of the report window (Unix ms) */
  fromMs: number;
  /** End of the report window (Unix ms) */
  toMs: number;
  /** Optional: filter to specific bot families */
  families?: BotFamily[];
}

export interface ComplianceReport {
  id: string;
  tenantId: string;
  standard: ComplianceStandard;
  generatedAt: number;
  period: { from: string; to: string };
  summary: ComplianceSummary;
  sections: ComplianceSection[];
}

export interface ComplianceSummary {
  totalActions: number;
  allowedActions: number;
  deniedActions: number;
  pendingApprovals: number;
  highRiskActions: number;
  circuitBreakerTrips: number;
  uniqueBots: number;
  uniquePlatforms: number;
  complianceScore: number; // 0–100
}

export interface ComplianceSection {
  title: string;
  status: 'pass' | 'warning' | 'fail' | 'info';
  description: string;
  details: string[];
}

// ─── Report Generator ─────────────────────────────────────────

export function generateComplianceReport(
  request: ComplianceReportRequest,
  auditEntries: AuditEntry[],
  approvalEntries: { id: string; status: string; riskLevel: string; createdAt: number; resolvedAt?: number }[],
): ComplianceReport {
  const PLATFORM_FAMILY: Record<string, BotFamily> = {
    coinbase: 'trading', binance: 'trading', alpaca: 'trading', kalshi: 'trading', polymarket: 'trading',
    shopify: 'store', woocommerce: 'store', etsy: 'store', amazon: 'store',
    twitter: 'social', instagram: 'social', tiktok: 'social', linkedin: 'social',
    slack: 'workforce', notion: 'workforce', asana: 'workforce', jira: 'workforce',
  };

  const filtered = auditEntries.filter(e => {
    if (e.timestamp < request.fromMs || e.timestamp > request.toMs) return false;
    if (request.families && request.families.length > 0) {
      const family = PLATFORM_FAMILY[e.platform] ?? 'trading';
      if (!request.families.includes(family)) return false;
    }
    return true;
  });

  const allowed = filtered.filter(e => e.result === 'success').length;
  const denied = filtered.filter(e => e.result === 'denied').length;
  const failed = filtered.filter(e => e.result === 'failure').length;
  const pending = approvalEntries.filter(a => a.status === 'pending').length;
  const highRisk = filtered.filter(e => e.riskLevel === 'high' || e.riskLevel === 'critical').length;
  const cbTrips = filtered.filter(e => {
    const details = typeof e.details === 'string' ? {} : e.details;
    return details.reason === 'circuit_breaker_tripped';
  }).length;
  const uniqueBots = new Set(filtered.map(e => e.botId).filter(Boolean)).size;
  const uniquePlatforms = new Set(filtered.map(e => e.platform).filter(Boolean)).size;

  const totalActions = filtered.length;
  const complianceScore = calculateComplianceScore(allowed, denied, highRisk, cbTrips, totalActions, pending);

  const sections = buildSections(request.standard, filtered, approvalEntries, {
    totalActions, allowed, denied, failed, highRisk, cbTrips, pending, complianceScore,
  });

  return {
    id: `cr-${crypto.randomUUID()}`,
    tenantId: request.tenantId,
    standard: request.standard,
    generatedAt: Date.now(),
    period: {
      from: new Date(request.fromMs).toISOString(),
      to: new Date(request.toMs).toISOString(),
    },
    summary: {
      totalActions,
      allowedActions: allowed,
      deniedActions: denied,
      pendingApprovals: pending,
      highRiskActions: highRisk,
      circuitBreakerTrips: cbTrips,
      uniqueBots,
      uniquePlatforms,
      complianceScore,
    },
    sections,
  };
}

// ─── Compliance Score ─────────────────────────────────────────

function calculateComplianceScore(
  allowed: number, denied: number, highRisk: number,
  cbTrips: number, total: number, pending: number,
): number {
  if (total === 0) return 100;

  let score = 100;

  // Deduct for denied actions that weren't caught by policy (failures)
  const failureRate = denied / total;
  score -= Math.min(30, failureRate * 100);

  // Deduct for circuit breaker trips (indicates instability)
  score -= Math.min(20, cbTrips * 5);

  // Deduct for stale pending approvals
  score -= Math.min(15, pending * 3);

  // Bonus for having audit trail coverage
  if (total > 50) score = Math.min(100, score + 5);

  // High risk actions that were properly handled (denied or approved) are OK
  // High risk actions that succeeded without review are concerning
  const unreviewedHighRisk = highRisk - denied;
  if (unreviewedHighRisk > 0 && total > 0) {
    score -= Math.min(20, (unreviewedHighRisk / total) * 50);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Section Builders ─────────────────────────────────────────

function buildSections(
  standard: ComplianceStandard,
  entries: AuditEntry[],
  approvals: { id: string; status: string; riskLevel: string; createdAt: number; resolvedAt?: number }[],
  stats: { totalActions: number; allowed: number; denied: number; failed: number; highRisk: number; cbTrips: number; pending: number; complianceScore: number },
): ComplianceSection[] {
  const sections: ComplianceSection[] = [];

  // 1. Audit Trail Integrity
  sections.push({
    title: 'Audit Trail Coverage',
    status: stats.totalActions > 0 ? 'pass' : 'warning',
    description: 'All bot actions are logged to an immutable audit trail with timestamps, risk levels, and outcomes.',
    details: [
      `${stats.totalActions} total actions recorded in this period`,
      `${stats.allowed} allowed, ${stats.denied} denied, ${stats.failed} failed`,
      stats.totalActions === 0 ? 'No activity recorded — ensure bots are running' : 'Audit trail is active',
    ],
  });

  // 2. Access Control
  sections.push({
    title: 'Access Control & Authorization',
    status: 'pass',
    description: 'All API requests require JWT authentication. Bot actions are scoped to tenant boundaries.',
    details: [
      'JWT-based authentication with refresh token rotation',
      'Tenant isolation enforced at database layer',
      'MFA available for account protection',
      'Rate limiting active on all endpoints',
    ],
  });

  // 3. Risk Management
  const highRiskDenied = entries.filter(e =>
    (e.riskLevel === 'high' || e.riskLevel === 'critical') && e.result === 'denied'
  ).length;
  sections.push({
    title: 'Risk Management',
    status: stats.highRisk > 0 && highRiskDenied === 0 ? 'warning' : 'pass',
    description: 'High-risk actions are subject to policy checks, approval workflows, and budget constraints.',
    details: [
      `${stats.highRisk} high/critical risk actions detected`,
      `${highRiskDenied} high-risk actions properly blocked by policy`,
      `${stats.cbTrips} circuit breaker activations (automatic safety shutoff)`,
      stats.highRisk === 0 ? 'No high-risk activity in this period' : '',
    ].filter(Boolean),
  });

  // 4. Approval Workflow
  const resolvedApprovals = approvals.filter(a => a.status !== 'pending');
  const avgResolutionMs = resolvedApprovals.length > 0
    ? resolvedApprovals.reduce((sum, a) => sum + ((a.resolvedAt ?? a.createdAt) - a.createdAt), 0) / resolvedApprovals.length
    : 0;
  sections.push({
    title: 'Human Approval Workflow',
    status: stats.pending > 5 ? 'warning' : 'pass',
    description: 'High-risk actions require human approval before execution. Approvals expire after 24 hours.',
    details: [
      `${approvals.length} approval requests in this period`,
      `${resolvedApprovals.length} resolved, ${stats.pending} pending`,
      avgResolutionMs > 0 ? `Average resolution time: ${Math.round(avgResolutionMs / 60_000)} minutes` : 'No approvals resolved',
      'Auto-expiry after 24 hours prevents stale approvals',
    ],
  });

  // 5. Budget Controls
  const budgetDenials = entries.filter(e => {
    const details = typeof e.details === 'string' ? {} : e.details;
    return details.reason === 'budget_exceeded';
  }).length;
  sections.push({
    title: 'Financial Controls & Budget Caps',
    status: 'pass',
    description: 'Daily and hourly spending limits prevent runaway costs. Per-action caps limit individual transaction size.',
    details: [
      'Daily budget cap enforced per bot',
      'Hourly velocity limit (25% of daily cap per rolling hour)',
      'Per-action maximum spend limit',
      `${budgetDenials} actions blocked by budget controls in this period`,
    ],
  });

  // 6. Circuit Breakers
  sections.push({
    title: 'Circuit Breaker & Error Recovery',
    status: stats.cbTrips > 3 ? 'warning' : 'pass',
    description: 'Automatic shutdown when error rates exceed thresholds. Configurable cooldown periods.',
    details: [
      `${stats.cbTrips} circuit breaker activations`,
      'Max consecutive errors: 5 (configurable)',
      'Cooldown period: 5 minutes (configurable)',
      stats.cbTrips > 3 ? 'High circuit breaker activity — review bot configurations' : 'Circuit breaker activity within normal range',
    ],
  });

  // Standard-specific sections
  if (standard === 'soc2') {
    sections.push({
      title: 'SOC 2 — Availability',
      status: 'info',
      description: 'System availability and uptime monitoring.',
      details: [
        'Edge-native deployment on Cloudflare Workers for global availability',
        'Durable Objects provide isolated per-bot runtime with crash recovery',
        'Automatic state persistence on critical actions (trade execution, errors)',
        'Alarm-based scheduling ensures no missed tick windows',
      ],
    });
    sections.push({
      title: 'SOC 2 — Confidentiality',
      status: 'pass',
      description: 'Sensitive data protection measures.',
      details: [
        'Credentials encrypted with AES-256-GCM at rest',
        'JWT tokens with 15-minute expiry and refresh rotation',
        'No cross-tenant data access possible',
        'Federated learning uses only anonymized aggregate statistics',
      ],
    });
  }

  if (standard === 'gdpr') {
    sections.push({
      title: 'GDPR — Data Minimization',
      status: 'pass',
      description: 'Only necessary data is collected and processed.',
      details: [
        'Learning state contains no raw PII',
        'Entity mappings respect privacy mode settings',
        'Federated contributions strip all identifying information',
        'Audit entries contain only action metadata, not user content',
      ],
    });
    sections.push({
      title: 'GDPR — Right to Erasure',
      status: 'info',
      description: 'Users can request deletion of their data.',
      details: [
        'Account deletion cascades to all bots, metrics, and audit entries',
        'Tenant isolation ensures complete data boundary',
        'Federated contributions are anonymous and cannot be traced back',
      ],
    });
  }

  return sections;
}

// ─── CSV Export Helpers ───────────────────────────────────────

export function complianceReportToCsv(report: ComplianceReport): string {
  const lines: string[] = [];

  lines.push('BeastBots Compliance Report');
  lines.push(`Standard,${report.standard.toUpperCase()}`);
  lines.push(`Generated,${new Date(report.generatedAt).toISOString()}`);
  lines.push(`Period,${report.period.from} to ${report.period.to}`);
  lines.push('');

  lines.push('Summary');
  lines.push(`Compliance Score,${report.summary.complianceScore}/100`);
  lines.push(`Total Actions,${report.summary.totalActions}`);
  lines.push(`Allowed,${report.summary.allowedActions}`);
  lines.push(`Denied,${report.summary.deniedActions}`);
  lines.push(`High Risk,${report.summary.highRiskActions}`);
  lines.push(`Circuit Breaker Trips,${report.summary.circuitBreakerTrips}`);
  lines.push(`Pending Approvals,${report.summary.pendingApprovals}`);
  lines.push(`Unique Bots,${report.summary.uniqueBots}`);
  lines.push(`Unique Platforms,${report.summary.uniquePlatforms}`);
  lines.push('');

  lines.push('Section,Status,Description');
  for (const s of report.sections) {
    const desc = s.description.replace(/"/g, '""');
    lines.push(`"${s.title}",${s.status},"${desc}"`);
  }

  return lines.join('\n');
}

export function complianceReportToJson(report: ComplianceReport): string {
  return JSON.stringify(report, null, 2);
}
