import type { SafetyStore, ApprovalRequest, AuditEntry } from '@beastbots/shared';
import { getDb } from './db.js';

export class DbSafetyStore implements SafetyStore {
  private normalizeApproval(request: ApprovalRequest, persist = true): ApprovalRequest {
    const now = Date.now();
    if (request.status === 'pending' && request.expiresAt && now > request.expiresAt) {
      const expiredRequest: ApprovalRequest = {
        ...request,
        status: 'rejected',
        resolvedAt: now,
        resolvedBy: 'system:expired',
      };

      if (persist) {
        this.updateApproval(expiredRequest);
      }

      return expiredRequest;
    }

    return request;
  }

  saveApproval(request: ApprovalRequest): void {
    const db = getDb();
    db.prepare(`INSERT INTO approvals (id, tenant_id, bot_id, platform, action, risk_level, policy_id, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      request.id, request.tenantId, request.botId, request.platform,
      request.action, request.riskLevel, request.policyId, request.status, request.createdAt, request.expiresAt ?? null
    );
  }

  getApproval(id: string): ApprovalRequest | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.normalizeApproval(this.rowToApproval(row));
  }

  listApprovals(
    tenantId: string,
    options?: { botId?: string; status?: ApprovalRequest['status']; limit?: number },
  ): ApprovalRequest[] {
    const db = getDb();
    const clauses = ['tenant_id = ?'];
    const params: Array<string | number> = [tenantId];

    if (options?.botId) {
      clauses.push('bot_id = ?');
      params.push(options.botId);
    }

    const limit = options?.limit && options.limit > 0 ? options.limit : 100;
    params.push(limit);

    const rows = db.prepare(
      `SELECT * FROM approvals WHERE ${clauses.join(' AND ')} ORDER BY COALESCE(resolved_at, created_at) DESC LIMIT ?`
    ).all(...params) as Record<string, unknown>[];

    return rows
      .map((row) => this.normalizeApproval(this.rowToApproval(row)))
      .filter((request) => !options?.status || request.status === options.status);
  }

  listPendingApprovals(tenantId: string): ApprovalRequest[] {
    return this.listApprovals(tenantId, { status: 'pending' });
  }

  consumeApprovalForAction(tenantId: string, botId: string, action: string): ApprovalRequest | undefined {
    const db = getDb();
    const row = db.prepare(
      `SELECT * FROM approvals
       WHERE tenant_id = ? AND bot_id = ? AND action = ? AND status = 'approved'
       ORDER BY COALESCE(resolved_at, created_at) ASC
       LIMIT 1`
    ).get(tenantId, botId, action) as Record<string, unknown> | undefined;
    if (!row) return undefined;

    const resolvedAt = Number(row.resolved_at ?? Date.now());
    db.prepare('UPDATE approvals SET status = ?, resolved_at = ?, resolved_by = COALESCE(resolved_by, ?) WHERE id = ?').run(
      'consumed',
      resolvedAt,
      'system:consumed',
      row.id,
    );

    return this.rowToApproval({
      ...row,
      status: 'consumed',
      resolved_at: resolvedAt,
      resolved_by: row.resolved_by ?? 'system:consumed',
    });
  }

  updateApproval(request: ApprovalRequest): void {
    const db = getDb();
    db.prepare('UPDATE approvals SET status = ?, expires_at = ?, resolved_at = ?, resolved_by = ? WHERE id = ?').run(
      request.status, request.expiresAt ?? null, request.resolvedAt ?? null, request.resolvedBy ?? null, request.id
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
      expiresAt: (row.expires_at as number) ?? undefined,
      resolvedAt: (row.resolved_at as number) ?? undefined,
      resolvedBy: (row.resolved_by as string) ?? undefined,
    };
  }
}
