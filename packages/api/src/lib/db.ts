import Database from 'better-sqlite3';
import path from 'node:path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath = process.env.DATABASE_PATH ?? './beastbot.db';
  const resolved = path.resolve(dbPath);
  db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      plan TEXT NOT NULL DEFAULT 'starter',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenant_members (
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'member',
      PRIMARY KEY (tenant_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      platform TEXT NOT NULL,
      credential_type TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(tenant_id, platform)
    );

    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      family TEXT NOT NULL,
      platform TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      config TEXT NOT NULL,
      safety_config TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bot_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      total_ticks INTEGER NOT NULL DEFAULT 0,
      successful_actions INTEGER NOT NULL DEFAULT 0,
      failed_actions INTEGER NOT NULL DEFAULT 0,
      denied_actions INTEGER NOT NULL DEFAULT 0,
      total_pnl_usd REAL NOT NULL DEFAULT 0,
      uptime_ms INTEGER NOT NULL DEFAULT 0,
      last_error_message TEXT,
      last_error_at INTEGER,
      recorded_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decision_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      action TEXT NOT NULL,
      result TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      duration_ms INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      bot_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      action TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      policy_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      resolved_by TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      bot_id TEXT,
      platform TEXT,
      action TEXT NOT NULL,
      result TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS onboarding (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      completed INTEGER NOT NULL DEFAULT 0,
      current_step INTEGER NOT NULL DEFAULT 0,
      selected_family TEXT,
      first_bot_id TEXT,
      first_integration TEXT,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      token_hash TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      replaced_by TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      provider TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      data TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_bots_tenant ON bots(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_credentials_tenant ON credentials(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_tenant ON approvals(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_bot_metrics_bot ON bot_metrics(bot_id, recorded_at);
    CREATE INDEX IF NOT EXISTS idx_decision_log_bot ON decision_log(bot_id, created_at);
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
