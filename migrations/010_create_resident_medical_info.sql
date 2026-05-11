-- US-15-08: Resident medical info table
-- Migration: 010_create_resident_medical_info.sql
-- Epic: EP-15 | Sprint 8

CREATE TABLE IF NOT EXISTS resident_medical_info (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id         UUID        NOT NULL UNIQUE REFERENCES residents (id) ON DELETE CASCADE,
  facility_id         TEXT        NOT NULL,
  diagnoses           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  allergies           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  blood_type          TEXT,
  chronic_conditions  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resident_medical_info_resident ON resident_medical_info (resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_medical_info_facility ON resident_medical_info (facility_id);

CREATE TRIGGER trg_resident_medical_info_updated_at
  BEFORE UPDATE ON resident_medical_info
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
