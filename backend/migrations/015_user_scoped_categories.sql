-- Migration 015: Make categories user-wide instead of per-machine
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Backfill user_id from machines for existing categories if any
UPDATE categories c
SET user_id = m.user_id
FROM machines m
WHERE c.machine_id = m.id AND c.user_id IS NULL;

-- Make machine_id nullable for user-wide categories
ALTER TABLE categories ALTER COLUMN machine_id DROP NOT NULL;

-- Drop old per-machine unique index and add user-wide unique index
DROP INDEX IF EXISTS idx_categories_machine_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name_unique 
ON categories(user_id, LOWER(name));

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_categories_user_id 
ON categories(user_id);
