-- Migration 021: Allow 'all' format in backup_config and backup_history check constraints

ALTER TABLE backup_config DROP CONSTRAINT IF EXISTS backup_config_format_check;
ALTER TABLE backup_config ADD CONSTRAINT backup_config_format_check CHECK (format IN ('sql', 'json', 'csv', 'zip', 'all'));

ALTER TABLE backup_history DROP CONSTRAINT IF EXISTS backup_history_format_check;
ALTER TABLE backup_history ADD CONSTRAINT backup_history_format_check CHECK (format IN ('sql', 'json', 'csv', 'zip', 'all'));
