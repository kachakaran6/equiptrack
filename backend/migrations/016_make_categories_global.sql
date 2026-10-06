-- Migration 016: Make categories globally shared across all users
-- Drop per-user unique index if exists
DROP INDEX IF EXISTS idx_categories_user_name_unique;
DROP INDEX IF EXISTS idx_categories_machine_name_unique;

-- Deduplicate category names across all users if any exist before creating global unique index
DO $$
DECLARE
    dup RECORD;
    keeper UUID;
BEGIN
    FOR dup IN 
        SELECT LOWER(name) as lower_name, COUNT(*) 
        FROM categories 
        GROUP BY LOWER(name) 
        HAVING COUNT(*) > 1
    LOOP
        -- Find the primary/oldest category id
        SELECT id INTO keeper 
        FROM categories 
        WHERE LOWER(name) = dup.lower_name 
        ORDER BY created_at ASC, id ASC 
        LIMIT 1;

        -- Update sections that point to any of the duplicates
        UPDATE sections 
        SET category_id = keeper 
        WHERE category_id IN (
            SELECT id FROM categories 
            WHERE LOWER(name) = dup.lower_name AND id != keeper
        );

        -- Delete the duplicate category rows
        DELETE FROM categories 
        WHERE LOWER(name) = dup.lower_name AND id != keeper;
    END LOOP;
END $$;

-- Create global unique index on category name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_global_name_unique 
ON categories(LOWER(name));
