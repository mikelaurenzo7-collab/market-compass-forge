import { getDb } from './db.js';

export interface AuditRecord {
  tenantId: string;
  userId?: string;
  botId?: string;
  platform?: string;
  action: string;
  result: string;
  riskLevel: string;
  details?: string;
}

export function logAudit(rec: AuditRecord): void {
  const id = `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const now = Date.now();
  const db = getDb();
  db.prepare(
    'INSERT INTO audit_log (id, tenant_id, bot_id, platform, action, result, risk_level, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    rec.tenantId,
    rec.botId || null,
    rec.platform || null,
    rec.action,
    rec.result,
    rec.riskLevel,
    rec.details || '',
    now
  );
}
