-- Migration 005: Webhook events and notification preferences
-- Webhook events queue for real-time platform integrations
-- Notification preferences for user-configurable alerts

CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  processed INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  processed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant ON webhook_events(tenant_id, processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_platform ON webhook_events(platform, event_type);

CREATE TABLE IF NOT EXISTS notification_preferences (
  tenant_id TEXT PRIMARY KEY,
  preferences TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);
