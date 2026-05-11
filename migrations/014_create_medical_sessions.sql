-- US-13-03: Medical sessions table
-- Migration: 014_create_medical_sessions.sql
-- Epic: EP-13 | Sprint 9

CREATE TABLE IF NOT EXISTS medical_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  type            TEXT        NOT NULL DEFAULT 'doctor'
                              CHECK (type IN ('doctor', 'pt', 'vitals')),
  specialist_name TEXT,
  session_date    DATE        NOT NULL,
  session_time    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_sessions_facility ON medical_sessions (facility_id);
CREATE INDEX IF NOT EXISTS idx_medical_sessions_resident ON medical_sessions (resident_id);
CREATE INDEX IF NOT EXISTS idx_medical_sessions_type     ON medical_sessions (type);
