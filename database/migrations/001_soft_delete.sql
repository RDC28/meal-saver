-- Migration 001: Add soft-delete support to users table
--
-- Run this against your Neon database BEFORE updating lib/db/schema.ts
-- to include the deleted_at column.
--
-- After running this migration, update schema.ts to add:
--   deleted_at: timestamp('deleted_at', { withTimezone: true })
--
-- And update app/api/auth/account/route.ts to also set deleted_at = NOW().
-- A cron job can then hard-delete rows where deleted_at < NOW() - INTERVAL '30 days'.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for the cleanup cron job
CREATE INDEX IF NOT EXISTS idx_users_deleted_at
  ON users (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Optional: view of active (non-deleted) users
CREATE OR REPLACE VIEW active_users AS
  SELECT * FROM users
  WHERE deleted_at IS NULL AND is_active = TRUE;
