-- Migration 007: Federated learning, push subscriptions, compliance reports, performance reports

-- Federated learning opt-in config per tenant
CREATE TABLE IF NOT EXISTS federated_learning_config (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id),
  enabled INTEGER NOT NULL DEFAULT 0,
  contribution_interval_ms INTEGER NOT NULL DEFAULT 86400000,
  last_contributed_at INTEGER NOT NULL DEFAULT 0,
  total_contributions INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- Anonymized federated contributions (no tenant IDs stored here)
CREATE TABLE IF NOT EXISTS federated_contributions (
  id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  strategy TEXT NOT NULL,
  window_ms INTEGER NOT NULL,
  metrics TEXT NOT NULL,
  bot_age_days INTEGER NOT NULL,
  contributed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_federated_family_strategy ON federated_contributions(family, strategy);

-- Strategy benchmarks (aggregated from contributions)
CREATE TABLE IF NOT EXISTS strategy_benchmarks (
  family TEXT NOT NULL,
  strategy TEXT NOT NULL,
  sample_size INTEGER NOT NULL,
  success_rate TEXT NOT NULL,
  pnl_return_percent TEXT NOT NULL,
  error_rate TEXT NOT NULL,
  avg_tick_duration_ms TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (family, strategy)
);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_sub_tenant ON push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_sub_endpoint ON push_subscriptions(endpoint);

-- Push notification preferences per user
CREATE TABLE IF NOT EXISTS push_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  preferences TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);

-- Compliance reports (generated and cached)
CREATE TABLE IF NOT EXISTS compliance_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  standard TEXT NOT NULL,
  from_ms INTEGER NOT NULL,
  to_ms INTEGER NOT NULL,
  report TEXT NOT NULL,
  generated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compliance_tenant ON compliance_reports(tenant_id, generated_at);

-- Performance reports
CREATE TABLE IF NOT EXISTS performance_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  period TEXT NOT NULL,
  from_ms INTEGER NOT NULL,
  to_ms INTEGER NOT NULL,
  report TEXT NOT NULL,
  generated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_performance_tenant ON performance_reports(tenant_id, generated_at);
