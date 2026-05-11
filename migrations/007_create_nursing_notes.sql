-- US-12-01: Nursing notes table for nursing workflow
-- Migration: 007_create_nursing_notes.sql
-- Epic: EP-12 | Sprint 8

CREATE TABLE IF NOT EXISTS nursing_notes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  author_id       TEXT        NOT NULL,
  content         TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'routine'
                              CHECK (category IN ('routine', 'concern', 'handoff')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nursing_notes_facility  ON nursing_notes (facility_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_resident  ON nursing_notes (resident_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_author    ON nursing_notes (author_id);

CREATE TRIGGER trg_nursing_notes_updated_at
  BEFORE UPDATE ON nursing_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
