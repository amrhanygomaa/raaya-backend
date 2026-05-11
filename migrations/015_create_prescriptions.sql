-- US-13-05: Medical prescriptions table
-- Migration: 015_create_prescriptions.sql
-- Epic: EP-13 | Sprint 10

CREATE TABLE IF NOT EXISTS medical_prescriptions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       TEXT        NOT NULL,
  resident_id       UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  doctor_name       TEXT,
  prescription_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  file_url          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_facility ON medical_prescriptions (facility_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_resident ON medical_prescriptions (resident_id);
