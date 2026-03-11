import type { SafetyStore, ApprovalRequest, AuditEntry } from '@beastbots/shared';
import { getDb } from './db.js';

export class DbSafetyStore implements SafetyStore {
  saveApproval(request: ApprovalRequest): void {
    const db = getDb();
    db.prepare(`INSERT INTO approvals (id, tenant_id, bot_id, platform, action, risk_level, policy_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      request.id, request.tenantId, request.botId, request.platform,
      request.action, request.riskLevel, request.policyId, request.status, request.createdAt
    );
  }

  getApproval(id: string): ApprovalRequest | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToApproval(row);
  }

  listPendingApprovals(tenantId: string): ApprovalRequest[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM approvals WHERE tenant_id = ? AND status = ?').all(tenantId, 'pending') as Record<string, unknown>[];
    return rows.map(r => this.rowToApproval(r));
  }

  updateApproval(request: ApprovalRequest): void {
    const db = getDb();
    db.prepare('UPDATE approvals SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?').run(
      request.status, request.resolvedAt ?? null, request.resolvedBy ?? null, request.id
    );
  }

  appendAuditEntry(entry: AuditEntry): void {
    const db = getDb();
    db.prepare(`INSERT INTO audit_log (id, tenant_id, bot_id, platform, action, result, risk_level, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      entry.id, entry.tenantId, entry.botId ?? null, entry.platform ?? null,
      entry.action, entry.result, entry.riskLevel,
      typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details ?? {}),
      entry.timestamp
    );
  }

  getAuditEntries(tenantId: string, limit: number): AuditEntry[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM audit_log WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?').all(tenantId, limit) as Record<string, unknown>[];
    return rows.map(r => ({
      id: r.id as string,
      tenantId: r.tenant_id as string,
      botId: r.bot_id as string,
      platform: r.platform as AuditEntry['platform'],
      action: r.action as string,
      result: r.result as AuditEntry['result'],
      riskLevel: r.risk_level as AuditEntry['riskLevel'],
      details: r.details ? JSON.parse(r.details as string) : undefined,
      timestamp: r.created_at as number,
    }));
  }

  private rowToApproval(row: Record<string, unknown>): ApprovalRequest {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      botId: row.bot_id as string,
      platform: row.platform as ApprovalRequest['platform'],
      action: row.action as string,
      riskLevel: row.risk_level as ApprovalRequest['riskLevel'],
      policyId: row.policy_id as string,
      status: row.status as ApprovalRequest['status'],
      createdAt: row.created_at as number,
      resolvedAt: (row.resolved_at as number) ?? undefined,
      resolvedBy: (row.resolved_by as string) ?? undefined,
    };
  }
}
