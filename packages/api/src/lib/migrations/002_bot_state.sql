-- Migration 002: Add bot_state table for runtime persistence
-- Stores serialized bot runtime state so bots survive API restarts.

CREATE TABLE IF NOT EXISTS bot_state (
  bot_id TEXT PRIMARY KEY REFERENCES bots(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  family TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  engine_state TEXT NOT NULL DEFAULT '{}',
  safety_state TEXT NOT NULL DEFAULT '{}',
  metrics TEXT NOT NULL DEFAULT '{}',
  tick_history TEXT NOT NULL DEFAULT '[]',
  last_tick_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bot_state_tenant ON bot_state(tenant_id);
