-- Migration 013: Create Inventory Management Tables
-- Supports dynamic custom fields, sub-products, and atomic stock IN/OUT transactions

CREATE TABLE IF NOT EXISTS inventory_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_product_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_field_label UNIQUE (product_id, label)
);

CREATE TABLE IF NOT EXISTS inventory_sub_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_sub_product_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_product_id UUID NOT NULL REFERENCES inventory_sub_products(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES inventory_product_fields(id) ON DELETE CASCADE,
    value TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sub_product_field UNIQUE (sub_product_id, field_id)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_product_id UUID NOT NULL REFERENCES inventory_sub_products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
    quantity INT NOT NULL CHECK (quantity > 0),
    date DATE NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_products_user_id ON inventory_products(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_fields_product_id ON inventory_product_fields(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sub_products_product_id ON inventory_sub_products(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sub_products_user_id ON inventory_sub_products(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sub_product_values_sub_product_id ON inventory_sub_product_values(sub_product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sub_product_values_field_id ON inventory_sub_product_values(field_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_sub_product_id ON inventory_transactions(sub_product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_user_id ON inventory_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(date);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type);
