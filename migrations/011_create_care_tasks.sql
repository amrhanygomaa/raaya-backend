-- US-12-05: Care tasks table for nursing workflow
-- Migration: 011_create_care_tasks.sql
-- Epic: EP-12 | Sprint 9

CREATE TABLE IF NOT EXISTS care_tasks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'personal'
                              CHECK (category IN ('personal', 'recreational', 'hotel')),
  scheduled_time  TIMESTAMPTZ,
  is_completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_by    TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_tasks_facility  ON care_tasks (facility_id);
CREATE INDEX IF NOT EXISTS idx_care_tasks_resident  ON care_tasks (resident_id);
CREATE INDEX IF NOT EXISTS idx_care_tasks_completed ON care_tasks (is_completed);

CREATE TRIGGER trg_care_tasks_updated_at
  BEFORE UPDATE ON care_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
