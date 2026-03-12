import { Hono } from 'hono';
import { z } from 'zod';
import { verifyAuthHeader } from '../lib/auth.js';
import { getDb } from '../lib/db.js';
import {
  type ComplianceReport,
  type ComplianceReportRequest,
  generateComplianceReport,
  complianceReportToCsv,
  complianceReportToJson,
} from '@beastbots/shared';

export const complianceRouter = new Hono();

// ─── DB row types ─────────────────────────────────────────────
interface AuditRow { id: string; bot_id: string | null; platform: string | null; action: string; result: string; risk_level: string; details: string; created_at: number }
interface ApprovalRow { id: string; status: string; risk_level: string; created_at: number; resolved_at: number | null }
interface ReportRow { id: string; standard: string; from_ms: number; to_ms: number; report: string; generated_at: number }

// ─── POST /api/compliance/generate ─────────────────────────────
const generateSchema = z.object({
  standard: z.enum(['soc2', 'gdpr', 'general']),
  fromMs: z.number().positive(),
  toMs: z.number().positive(),
  families: z.array(z.enum(['trading', 'store', 'social', 'workforce'])).optional(),
});

complianceRouter.post('/generate', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.issues }, 400);

  if (parsed.data.toMs <= parsed.data.fromMs) {
    return c.json({ success: false, error: 'toMs must be after fromMs' }, 400);
  }

  const db = getDb();

  // Fetch audit entries for the period
  const auditEntries = db.prepare(
    'SELECT id, bot_id, platform, action, result, risk_level, details, created_at FROM audit_log WHERE tenant_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC'
  ).all(auth.tenantId, parsed.data.fromMs, parsed.data.toMs) as AuditRow[];

  // Fetch approval entries
  const approvalEntries = db.prepare(
    'SELECT id, status, risk_level, created_at, resolved_at FROM approvals WHERE tenant_id = ? AND created_at >= ? AND created_at <= ?'
  ).all(auth.tenantId, parsed.data.fromMs, parsed.data.toMs) as ApprovalRow[];

  const request: ComplianceReportRequest = {
    tenantId: auth.tenantId,
    standard: parsed.data.standard,
    fromMs: parsed.data.fromMs,
    toMs: parsed.data.toMs,
    families: parsed.data.families,
  };

  const mapped = auditEntries.map(e => ({
    id: e.id,
    tenantId: auth.tenantId,
    botId: e.bot_id ?? '',
    platform: e.platform ?? '' as any,
    action: e.action,
    result: e.result as any,
    riskLevel: e.risk_level as any,
    details: e.details ? (() => { try { return JSON.parse(e.details); } catch { return {}; } })() : {},
    timestamp: e.created_at,
  }));

  const mappedApprovals = approvalEntries.map(a => ({
    id: a.id,
    status: a.status,
    riskLevel: a.risk_level,
    createdAt: a.created_at,
    resolvedAt: a.resolved_at ?? undefined,
  }));

  const report = generateComplianceReport(request, mapped, mappedApprovals);

  // Cache the report
  db.prepare(
    'INSERT INTO compliance_reports (id, tenant_id, standard, from_ms, to_ms, report, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(report.id, auth.tenantId, report.standard, request.fromMs, request.toMs, JSON.stringify(report), report.generatedAt);

  return c.json({ success: true, data: report });
});

// ─── GET /api/compliance/reports ───────────────────────────────
complianceRouter.get('/reports', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const rows = db.prepare(
    'SELECT id, standard, from_ms, to_ms, generated_at FROM compliance_reports WHERE tenant_id = ? ORDER BY generated_at DESC LIMIT 20'
  ).all(auth.tenantId) as { id: string; standard: string; from_ms: number; to_ms: number; generated_at: number }[];

  return c.json({
    success: true,
    data: rows.map(r => ({
      id: r.id,
      standard: r.standard,
      fromMs: r.from_ms,
      toMs: r.to_ms,
      generatedAt: r.generated_at,
    })),
  });
});

// ─── GET /api/compliance/reports/:id ───────────────────────────
complianceRouter.get('/reports/:id', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const row = db.prepare(
    'SELECT report FROM compliance_reports WHERE id = ? AND tenant_id = ?'
  ).get(c.req.param('id'), auth.tenantId) as { report: string } | undefined;

  if (!row) return c.json({ success: false, error: 'Report not found' }, 404);

  return c.json({ success: true, data: JSON.parse(row.report) as ComplianceReport });
});

// ─── GET /api/compliance/reports/:id/csv ───────────────────────
complianceRouter.get('/reports/:id/csv', async (c) => {
  const auth = await verifyAuthHeader(c.req.header('Authorization'));
  if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

  const db = getDb();
  const row = db.prepare(
    'SELECT report FROM compliance_reports WHERE id = ? AND tenant_id = ?'
  ).get(c.req.param('id'), auth.tenantId) as { report: string } | undefined;

  if (!row) return c.json({ success: false, error: 'Report not found' }, 404);

  const report = JSON.parse(row.report) as ComplianceReport;
  const csv = complianceReportToCsv(report);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="beastbots-compliance-${report.standard}-${new Date(report.generatedAt).toISOString().split('T')[0]}.csv"`,
    },
  });
});
