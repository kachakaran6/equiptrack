-- Migration 020: Add telegram_bot_token column to backup_config table
ALTER TABLE backup_config ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;
