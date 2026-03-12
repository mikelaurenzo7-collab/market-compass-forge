-- Support multiple credentials per platform (e.g., 2 Shopify stores, 3 Instagram accounts)
-- Add account_label to distinguish them and credential_id on bots to bind a bot to a specific credential

-- Recreate credentials table with account_label instead of UNIQUE(tenant_id, platform)
CREATE TABLE IF NOT EXISTS credentials_new (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  platform TEXT NOT NULL,
  account_label TEXT NOT NULL DEFAULT 'default',
  credential_type TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(tenant_id, platform, account_label)
);

INSERT INTO credentials_new (id, tenant_id, platform, account_label, credential_type, encrypted_data, status, expires_at, created_at, updated_at)
  SELECT id, tenant_id, platform, 'default', credential_type, encrypted_data, status, expires_at, created_at, updated_at
  FROM credentials;

DROP TABLE credentials;
ALTER TABLE credentials_new RENAME TO credentials;
CREATE INDEX IF NOT EXISTS idx_credentials_tenant ON credentials(tenant_id);

-- Add credential_id to bots so each bot knows which specific credential to use
ALTER TABLE bots ADD COLUMN credential_id TEXT REFERENCES credentials(id);
