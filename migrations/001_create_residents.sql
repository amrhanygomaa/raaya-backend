-- US-03-01: Core resident-related schema and migrations
-- Migration: 001_create_residents.sql
-- Epic: EP-03 | Sprint 2 (Weeks 3-4)
--
-- Creates the core resident, family_members, and linked_records tables
-- so that resident, family, and linked record types are stored consistently.

-- ── Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Residents ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS residents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,                         -- Cognito custom:facilityId
  first_name      TEXT        NOT NULL,
  last_name       TEXT        NOT NULL,
  date_of_birth   DATE        NOT NULL,
  gender          TEXT        NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  national_id     TEXT        UNIQUE,                           -- Saudi/national ID (optional, unique)
  room_number     TEXT,
  admission_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  discharge_date  DATE,
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'discharged', 'deceased')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_residents_facility_id  ON residents (facility_id);
CREATE INDEX IF NOT EXISTS idx_residents_status        ON residents (status);

-- ── Family Members ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  full_name       TEXT        NOT NULL,
  relationship    TEXT        NOT NULL,                         -- e.g. 'son', 'daughter', 'spouse'
  phone           TEXT,
  email           TEXT,
  is_primary      BOOLEAN     NOT NULL DEFAULT FALSE,           -- primary emergency contact
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_members_resident_id ON family_members (resident_id);

-- ── Linked Records (health records, documents, etc.) ─────────────────────
CREATE TABLE IF NOT EXISTS linked_records (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  record_type     TEXT        NOT NULL
                              CHECK (record_type IN (
                                'medication', 'diagnosis', 'lab_result',
                                'incident', 'care_plan', 'document', 'other'
                              )),
  title           TEXT        NOT NULL,
  content         JSONB,                                         -- flexible payload per type
  recorded_by     TEXT,                                          -- Cognito sub (userId)
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linked_records_resident_id ON linked_records (resident_id);
CREATE INDEX IF NOT EXISTS idx_linked_records_type        ON linked_records (record_type);

-- ── updated_at trigger function ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_residents_updated_at
  BEFORE UPDATE ON residents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_family_members_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_linked_records_updated_at
  BEFORE UPDATE ON linked_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
