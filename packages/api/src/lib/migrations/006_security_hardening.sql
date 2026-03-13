-- Migration 006: Security hardening — MFA, account lockout, email verification
-- Sprint 3: Security & UX completeness

-- Add MFA fields to users
ALTER TABLE users ADD COLUMN mfa_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN mfa_backup_codes TEXT;  -- JSON array of hashed backup codes

-- Add account lockout fields
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until INTEGER;  -- Unix timestamp

-- Add email verification
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN email_verification_token TEXT;
ALTER TABLE users ADD COLUMN email_verification_sent_at INTEGER;
