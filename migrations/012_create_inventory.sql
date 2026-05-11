-- US-12-07: Inventory items table
-- Migration: 012_create_inventory.sql
-- Epic: EP-12 | Sprint 9

CREATE TABLE IF NOT EXISTS inventory_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       TEXT        NOT NULL,
  name              TEXT        NOT NULL,
  category          TEXT        NOT NULL DEFAULT 'supplies'
                                CHECK (category IN ('medications', 'personal', 'supplies')),
  current_stock     INT         NOT NULL DEFAULT 0,
  min_required      INT         NOT NULL DEFAULT 0,
  unit              TEXT        NOT NULL DEFAULT 'unit',
  last_restocked_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_facility ON inventory_items (facility_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items (category);

CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
