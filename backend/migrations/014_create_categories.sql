-- Migration 014: Create categories table and associate with sections
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Case-insensitive unique category name per machine
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_machine_name_unique 
ON categories(machine_id, LOWER(name));

-- Fast lookup of categories by machine
CREATE INDEX IF NOT EXISTS idx_categories_machine_id 
ON categories(machine_id);

-- Add category_id to sections with ON DELETE SET NULL
ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Fast lookup of sections by category
CREATE INDEX IF NOT EXISTS idx_sections_category_id 
ON sections(category_id);
