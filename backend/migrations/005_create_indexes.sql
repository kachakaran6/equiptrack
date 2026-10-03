-- Migration 005: Create performance & ownership indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_machines_user_id ON machines(user_id);
CREATE INDEX IF NOT EXISTS idx_sections_user_id ON sections(user_id);
CREATE INDEX IF NOT EXISTS idx_sections_machine_id ON sections(machine_id);
CREATE INDEX IF NOT EXISTS idx_sections_user_machine ON sections(user_id, machine_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_section_id ON usage_records(section_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_section ON usage_records(user_id, section_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_section_date ON usage_records(section_id, usage_date);
