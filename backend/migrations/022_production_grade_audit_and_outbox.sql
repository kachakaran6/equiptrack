-- Migration 022: Production-Grade PostgreSQL Audit Trail & PostHog Transactional Outbox
-- Idempotent, safe migration that preserves all existing audit records and schema.

-- 1. Upgrade audit_logs table with comprehensive forensic tracking columns
DO $$
BEGIN
    -- Add columns if not existing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'occurred_at') THEN
        ALTER TABLE audit_logs ADD COLUMN occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'ingested_at') THEN
        ALTER TABLE audit_logs ADD COLUMN ingested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'actor_user_id') THEN
        ALTER TABLE audit_logs ADD COLUMN actor_user_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'actor_email') THEN
        ALTER TABLE audit_logs ADD COLUMN actor_email VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'actor_role') THEN
        ALTER TABLE audit_logs ADD COLUMN actor_role VARCHAR(50) DEFAULT 'user';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'resource_label') THEN
        ALTER TABLE audit_logs ADD COLUMN resource_label VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'outcome') THEN
        ALTER TABLE audit_logs ADD COLUMN outcome VARCHAR(20) NOT NULL DEFAULT 'SUCCESS';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'source') THEN
        ALTER TABLE audit_logs ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT 'api';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'request_id') THEN
        ALTER TABLE audit_logs ADD COLUMN request_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'correlation_id') THEN
        ALTER TABLE audit_logs ADD COLUMN correlation_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'changed_fields') THEN
        ALTER TABLE audit_logs ADD COLUMN changed_fields JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'before_data') THEN
        ALTER TABLE audit_logs ADD COLUMN before_data JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'after_data') THEN
        ALTER TABLE audit_logs ADD COLUMN after_data JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'reason') THEN
        ALTER TABLE audit_logs ADD COLUMN reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'application_version') THEN
        ALTER TABLE audit_logs ADD COLUMN application_version VARCHAR(50);
    END IF;
END $$;

-- 2. Backfill existing legacy audit logs
UPDATE audit_logs 
SET actor_user_id = user_id 
WHERE actor_user_id IS NULL AND user_id IS NOT NULL;

UPDATE audit_logs 
SET actor_email = user_email 
WHERE actor_email IS NULL AND user_email IS NOT NULL;

UPDATE audit_logs 
SET occurred_at = created_at 
WHERE occurred_at IS NULL;

-- 3. Create indexes on audit_logs for high-performance forensic querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email ON audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source ON audit_logs(source);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome ON audit_logs(outcome);

-- 4. Create transactional audit_outbox table for PostHog delivery
CREATE TABLE IF NOT EXISTS audit_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_log_id UUID REFERENCES audit_logs(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,
    distinct_id VARCHAR(255) NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 10,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_outbox_pending ON audit_outbox(status, next_retry_at) 
WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_audit_outbox_audit_id ON audit_outbox(audit_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_outbox_created_at ON audit_outbox(created_at DESC);

-- 5. Immutability trigger: prevent updating or deleting historical audit records
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable and cannot be updated or deleted. (id: %)', OLD.id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_tampering();
