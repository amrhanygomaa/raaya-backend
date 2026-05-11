-- US-14-01: Activity sessions table
-- Migration: 017_create_activity_sessions.sql
-- Epic: EP-14 | Sprint 10

CREATE TABLE IF NOT EXISTS activity_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  description     TEXT,
  start_time      TIMESTAMPTZ NOT NULL,
  location        TEXT,
  participants    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_by      TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_sessions_facility ON activity_sessions (facility_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_start    ON activity_sessions (start_time);

CREATE TRIGGER trg_activity_sessions_updated_at
  BEFORE UPDATE ON activity_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
