-- Migration 006: Create RLS policies for shared authenticated workspace

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users full access to machines" ON public.machines;
DROP POLICY IF EXISTS "Allow authenticated users full access to sections" ON public.sections;
DROP POLICY IF EXISTS "Allow authenticated users full access to usage_records" ON public.usage_records;

-- Machines policies
CREATE POLICY "Allow authenticated users full access to machines"
ON public.machines
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Sections policies
CREATE POLICY "Allow authenticated users full access to sections"
ON public.sections
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Usage records policies
CREATE POLICY "Allow authenticated users full access to usage_records"
ON public.usage_records
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
