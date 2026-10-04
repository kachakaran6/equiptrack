-- Migration 010: Create backup_history and backup_config tables

-- Backup history records every backup attempt
CREATE TABLE IF NOT EXISTS backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'started', -- started | success | failed
    format VARCHAR(20),                             -- sql | json | csv | zip
    file_size BIGINT,
    checksum VARCHAR(128),
    destination VARCHAR(50) DEFAULT 'telegram',    -- telegram | local
    error_message TEXT,
    triggered_by VARCHAR(50) DEFAULT 'scheduler',  -- scheduler | manual | api
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT backup_history_status_check CHECK (status IN ('started', 'success', 'failed')),
    CONSTRAINT backup_history_format_check CHECK (format IN ('sql', 'json', 'csv', 'zip'))
);

CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
CREATE INDEX IF NOT EXISTS idx_backup_history_created_at ON backup_history(created_at DESC);

-- Backup configuration stored in database (values override env vars at runtime if set)
CREATE TABLE IF NOT EXISTS backup_config (
    id INTEGER PRIMARY KEY DEFAULT 1,              -- Singleton row
    enabled BOOLEAN NOT NULL DEFAULT true,
    cron_expression VARCHAR(100) NOT NULL DEFAULT '0 2 * * *',
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    format VARCHAR(20) NOT NULL DEFAULT 'sql',
    compression VARCHAR(20) NOT NULL DEFAULT 'gzip',
    retention_days INTEGER NOT NULL DEFAULT 30,
    telegram_chat_id VARCHAR(100),
    telegram_enabled BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT backup_config_singleton CHECK (id = 1),
    CONSTRAINT backup_config_format_check CHECK (format IN ('sql', 'json', 'csv', 'zip')),
    CONSTRAINT backup_config_compression_check CHECK (compression IN ('none', 'gzip'))
);

-- Insert default singleton config row
INSERT INTO backup_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
