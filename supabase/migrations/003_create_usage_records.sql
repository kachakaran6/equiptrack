-- Migration 003: Create usage_records table
-- Note: usage_days is dynamically calculated and deliberately NOT stored.
CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    usage_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE OR REPLACE TRIGGER set_usage_records_updated_at
BEFORE UPDATE ON public.usage_records
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();
