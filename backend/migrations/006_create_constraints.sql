-- Migration 006: Add constraints and unique checks
-- Prevents duplicate date entries for the same section under the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_section_usage_date 
ON usage_records(section_id, usage_date);
