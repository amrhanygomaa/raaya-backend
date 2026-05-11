-- US-13-01: Doctor visits table
-- Migration: 013_create_doctor_visits.sql
-- Epic: EP-13 | Sprint 9

CREATE TABLE IF NOT EXISTS doctor_visits (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  doctor_name     TEXT        NOT NULL,
  specialty       TEXT,
  visit_date      DATE        NOT NULL,
  purpose         TEXT,
  results         TEXT,
  created_by      TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_visits_facility ON doctor_visits (facility_id);
CREATE INDEX IF NOT EXISTS idx_doctor_visits_resident ON doctor_visits (resident_id);
CREATE INDEX IF NOT EXISTS idx_doctor_visits_date     ON doctor_visits (visit_date);

CREATE TRIGGER trg_doctor_visits_updated_at
  BEFORE UPDATE ON doctor_visits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
