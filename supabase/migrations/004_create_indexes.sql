-- Migration 004: Create indexes
CREATE INDEX IF NOT EXISTS idx_sections_machine_id
ON public.sections(machine_id);

CREATE INDEX IF NOT EXISTS idx_usage_records_section_id
ON public.usage_records(section_id);

CREATE INDEX IF NOT EXISTS idx_usage_records_section_date
ON public.usage_records(section_id, usage_date);
