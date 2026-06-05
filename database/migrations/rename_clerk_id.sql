-- Migration: Rename clerk_id to password_hash in the users table

ALTER TABLE users RENAME COLUMN clerk_id TO password_hash;
