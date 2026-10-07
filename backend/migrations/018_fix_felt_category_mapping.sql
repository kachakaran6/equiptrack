-- Migration 018: Correct Felt category mapping for all Felt components
-- 1. Ensure global 'Felt' category exists
INSERT INTO categories (name)
VALUES ('Felt')
ON CONFLICT (LOWER(name)) DO NOTHING;

-- 2. Explicitly map all Felt components to the global 'Felt' category
UPDATE sections
SET category_id = (SELECT id FROM categories WHERE LOWER(name) = 'felt' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(name) LIKE '%felt%';

-- 3. Explicitly ensure Roll components are in 'Roll' category
UPDATE sections
SET category_id = (SELECT id FROM categories WHERE LOWER(name) = 'roll' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(name) LIKE '%roll%' AND LOWER(name) NOT LIKE '%felt%';
