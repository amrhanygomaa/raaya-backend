-- US-14-06: Memory moments / memory wall table
-- Migration: 020_create_memory_moments.sql
-- Epic: EP-14 | Sprint 11

CREATE TABLE IF NOT EXISTS memory_moments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  image_url       TEXT,
  activity_title  TEXT        NOT NULL,
  appreciations   INT         NOT NULL DEFAULT 0,
  uploaded_by     TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_moments_facility ON memory_moments (facility_id);
CREATE INDEX IF NOT EXISTS idx_memory_moments_resident ON memory_moments (resident_id);
