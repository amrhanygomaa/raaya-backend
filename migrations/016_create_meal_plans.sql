-- US-13-07: Meal plans table
-- Migration: 016_create_meal_plans.sql
-- Epic: EP-13 | Sprint 10

CREATE TABLE IF NOT EXISTS meal_plans (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id           TEXT        NOT NULL,
  resident_id           UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  plan_date             DATE        NOT NULL,
  breakfast             TEXT,
  lunch                 TEXT,
  dinner                TEXT,
  special_instructions  TEXT,
  created_by            TEXT        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_facility ON meal_plans (facility_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_resident ON meal_plans (resident_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_date     ON meal_plans (plan_date);

CREATE TRIGGER trg_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
