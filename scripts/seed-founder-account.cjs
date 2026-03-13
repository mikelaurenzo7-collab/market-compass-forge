const Database = require('better-sqlite3');
const { hashSync } = require('bcryptjs');
const path = require('node:path');

const email = 'mikelaurenzo7@gmail.com'.toLowerCase();
const password = 'test12';
const displayName = 'Mikela Founder';
const now = Date.now();

const dbPath = path.resolve(process.env.DATABASE_PATH || './beastbot.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const existingUser = db.prepare('SELECT id, display_name FROM users WHERE email = ?').get(email);
const userId = existingUser?.id || uid('u');

const existingMembership = db.prepare('SELECT tenant_id FROM tenant_members WHERE user_id = ? LIMIT 1').get(userId);
const tenantId = existingMembership?.tenant_id || uid('t');
const passwordHash = hashSync(password, 12);

const tx = db.transaction(() => {
  if (existingUser) {
    db.prepare('UPDATE users SET password_hash = ?, display_name = COALESCE(display_name, ?), updated_at = ? WHERE id = ?')
      .run(passwordHash, displayName, now, userId);
  } else {
    db.prepare('INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, email, passwordHash, displayName, now, now);
  }

  const tenantExists = db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId);
  if (!tenantExists) {
    db.prepare('INSERT INTO tenants (id, name, owner_id, plan, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(tenantId, 'Founders Workspace', userId, 'starter', now);
  }

  db.prepare('INSERT OR IGNORE INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, ?)')
    .run(tenantId, userId, 'owner');

  db.prepare('INSERT INTO onboarding (user_id, completed, current_step, completed_at) VALUES (?, 1, 3, ?) ON CONFLICT(user_id) DO UPDATE SET completed = 1, current_step = 3, completed_at = excluded.completed_at')
    .run(userId, now);
});

tx();
db.close();

console.log(JSON.stringify({ ok: true, email, userId, tenantId, dbPath }));
