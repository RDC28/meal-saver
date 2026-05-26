-- Add clerk_id column to users table for Clerk auth integration
-- Run this if the neon-setup.sql was applied before clerk_id was added

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
