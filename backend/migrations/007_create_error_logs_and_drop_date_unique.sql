-- Migration 007: Create error_logs table and remove restrictive unique date index on usage_records

-- 1. Error Logs Table to store server and client errors for inspection
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email VARCHAR(255),
    source VARCHAR(50) DEFAULT 'server', -- 'server' | 'client'
    level VARCHAR(20) DEFAULT 'error',   -- 'error' | 'warn' | 'fatal'
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    message TEXT NOT NULL,
    stack_trace TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source);

-- 2. Drop unique index on section_id + usage_date to allow duplication and multiple logs on the same date
DROP INDEX IF EXISTS idx_unique_section_usage_date;
