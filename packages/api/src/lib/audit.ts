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

function sanitizeDetails(raw?: string): string {
  if (!raw) return '';
  try {
    // attempt JSON parse and redact tokens
    const obj = JSON.parse(raw);
    function recurse(o: any) {
      if (typeof o !== 'object' || o === null) return;
      for (const k of Object.keys(o)) {
        if (/token|secret|password|apikey/i.test(k)) {
          o[k] = '[REDACTED]';
        } else {
          recurse(o[k]);
        }
      }
    }
    recurse(obj);
    return JSON.stringify(obj);
  } catch {
    // fallback to regex redact in string
    return raw.replace(/("?\b(?:token|secret|password|apiKey)\b"?\s*:\s*")[^"\}]+("?)/gi, '$1[REDACTED]$2');
  }
}

export function logAudit(rec: AuditRecord): void {
  const id = `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const now = Date.now();
  const db = getDb();
  const details = sanitizeDetails(rec.details);
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
    details,
    now
  );
}
