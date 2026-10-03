-- ==============================================================================
-- EquipTrack Database Schema & Migrations
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- ==============================================================================

-- 1. Helper Function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Machines Table
CREATE TABLE IF NOT EXISTS public.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_machines_updated_at ON public.machines;
CREATE TRIGGER set_machines_updated_at
BEFORE UPDATE ON public.machines
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 3. Sections Table
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_sections_updated_at ON public.sections;
CREATE TRIGGER set_sections_updated_at
BEFORE UPDATE ON public.sections
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 4. Usage Records Table
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

DROP TRIGGER IF EXISTS set_usage_records_updated_at ON public.usage_records;
CREATE TRIGGER set_usage_records_updated_at
BEFORE UPDATE ON public.usage_records
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 5. Indexes for Fast Queries
CREATE INDEX IF NOT EXISTS idx_sections_machine_id ON public.sections(machine_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_section_id ON public.usage_records(section_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_section_date ON public.usage_records(section_id, usage_date);

-- 6. Row Level Security (RLS) - Shared Authenticated Dataset
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access to machines" ON public.machines;
CREATE POLICY "Allow authenticated users full access to machines"
ON public.machines
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated users full access to sections" ON public.sections;
CREATE POLICY "Allow authenticated users full access to sections"
ON public.sections
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated users full access to usage_records" ON public.usage_records;
CREATE POLICY "Allow authenticated users full access to usage_records"
ON public.usage_records
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Supabase Realtime Replication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'machines'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.machines;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sections'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sections;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'usage_records'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_records;
    END IF;
END $$;
