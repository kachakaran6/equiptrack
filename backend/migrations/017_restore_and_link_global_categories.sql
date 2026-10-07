-- Migration 017: Restore global categories and re-link all components
-- 1. Ensure global categories exist (case-insensitive deduplication)
INSERT INTO categories (name)
VALUES ('Bearing'), ('Felt'), ('Roll')
ON CONFLICT (LOWER(name)) DO NOTHING;

-- 2. Link all sections with "Roll" in their name to the global "Roll" category
UPDATE sections
SET category_id = (SELECT id FROM categories WHERE LOWER(name) = 'roll' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE (LOWER(name) LIKE '%roll%' OR LOWER(name) LIKE '%press%')
  AND (category_id IS NULL OR category_id NOT IN (SELECT id FROM categories));

-- 3. Link all sections with "Felt" in their name to the global "Felt" category
UPDATE sections
SET category_id = (SELECT id FROM categories WHERE LOWER(name) = 'felt' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(name) LIKE '%felt%'
  AND (category_id IS NULL OR category_id NOT IN (SELECT id FROM categories));

-- 4. Link all sections with "Bearing" in their name to the global "Bearing" category
UPDATE sections
SET category_id = (SELECT id FROM categories WHERE LOWER(name) = 'bearing' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(name) LIKE '%bearing%'
  AND (category_id IS NULL OR category_id NOT IN (SELECT id FROM categories));
