-- Migration 008: Explicit store ROI events for launch-grade commerce analytics

CREATE TABLE IF NOT EXISTS store_roi_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  revenue_usd REAL NOT NULL DEFAULT 0,
  units INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  UNIQUE(tenant_id, platform, event_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_store_roi_tenant_created ON store_roi_events(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_store_roi_event_type ON store_roi_events(platform, event_type);