-- Migration 019: Perfectly map Bearing, Felt, Roll, and Uncategorized components
-- 1. Ensure global categories exist
INSERT INTO categories (name)
VALUES ('Bearing'), ('Felt'), ('Roll')
ON CONFLICT (LOWER(name)) DO NOTHING;

-- 2. Felt components (e.g., First Press Felt Top/Bottom, Second Press Felt Top/Bottom) -> Felt (4 items)
UPDATE sections
SET category_id = (SELECT id FROM categories WHERE LOWER(name) = 'felt' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(name) LIKE '%felt%';

-- 3. Bearing components (e.g., Breast Roll (Front/Back), Couch Roll (Front/Back), Touch Roll Front/Back, Press Top/Bottom Front/Back) -> Bearing (18 items)
UPDATE sections
SET category_id = (SELECT id FROM categories WHERE LOWER(name) = 'bearing' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE (LOWER(name) LIKE '%front%' OR LOWER(name) LIKE '%back%' OR LOWER(name) LIKE '%bearing%')
  AND LOWER(name) NOT LIKE '%felt%';

-- 4. Roll components (e.g., Breast Roll, Couch Roll, First Press Roll Top/Bottom, Second Press Roll Top/Bottom, Touch Roll) -> Roll (7 items)
UPDATE sections
SET category_id = (SELECT id FROM categories WHERE LOWER(name) = 'roll' LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(name) LIKE '%roll%'
  AND LOWER(name) NOT LIKE '%front%'
  AND LOWER(name) NOT LIKE '%back%'
  AND LOWER(name) NOT LIKE '%felt%';

-- 5. Uncategorized components (Wire, Pressure Screen) -> Uncategorized (2 items)
UPDATE sections
SET category_id = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(name) = 'wire' OR LOWER(name) = 'pressure screen';
