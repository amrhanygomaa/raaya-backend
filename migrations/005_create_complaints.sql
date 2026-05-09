-- US-07-01: Complaints table for KPI complaint-closure metrics
-- Migration: 005_create_complaints.sql
-- Epic: EP-07 | Sprint 5 (Weeks 9-10)

CREATE TABLE IF NOT EXISTS complaints (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID        REFERENCES residents (id) ON DELETE SET NULL,
  facility_id     TEXT        NOT NULL,
  submitted_by    TEXT        NOT NULL,           -- Cognito sub (family or staff)
  category        TEXT        NOT NULL DEFAULT 'general'
                              CHECK (category IN (
                                'care_quality', 'staff_behavior', 'facility',
                                'food', 'communication', 'general', 'other'
                              )),
  subject         TEXT        NOT NULL,
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority        TEXT        NOT NULL DEFAULT 'medium'
                              CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  resolved_by     TEXT,
  resolved_at     TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_facility ON complaints (facility_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status   ON complaints (status);
CREATE INDEX IF NOT EXISTS idx_complaints_resident ON complaints (resident_id);

CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
