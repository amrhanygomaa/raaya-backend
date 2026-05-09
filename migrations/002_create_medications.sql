-- US-04-01: Medication schedules and dose logs
-- Migration: 002_create_medications.sql
-- Epic: EP-04 | Sprint 3 (Weeks 5-6)
--
-- Creates medication_schedules and dose_logs tables so that nurses can
-- manage medication schedules, log doses, and query overdue medications.

-- ── Medication Schedules ──────────────────────────────────────────────────
-- Each schedule is a recurring or one-off medication order for a resident.
CREATE TABLE IF NOT EXISTS medication_schedules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  facility_id     TEXT        NOT NULL,                           -- denormalised for fast scoping
  medication_name TEXT        NOT NULL,                           -- e.g. "Aspirin 100mg"
  dosage          TEXT        NOT NULL,                           -- e.g. "1 tablet"
  route           TEXT        NOT NULL DEFAULT 'oral'
                              CHECK (route IN (
                                'oral', 'iv', 'im', 'sc', 'topical',
                                'inhalation', 'sublingual', 'rectal', 'other'
                              )),
  frequency       TEXT        NOT NULL DEFAULT 'daily'
                              CHECK (frequency IN (
                                'once', 'daily', 'bid', 'tid', 'qid',
                                'weekly', 'prn', 'other'
                              )),
  scheduled_times TEXT[]      NOT NULL DEFAULT '{}',              -- e.g. {'08:00','20:00'}
  start_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,                                          -- NULL = ongoing
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  prescriber      TEXT,                                          -- doctor name or Cognito sub
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_med_schedules_resident   ON medication_schedules (resident_id);
CREATE INDEX IF NOT EXISTS idx_med_schedules_facility   ON medication_schedules (facility_id);
CREATE INDEX IF NOT EXISTS idx_med_schedules_active     ON medication_schedules (is_active);

-- ── Dose Logs ─────────────────────────────────────────────────────────────
-- Each row is a single administration / skip / miss event for a schedule.
CREATE TABLE IF NOT EXISTS dose_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     UUID        NOT NULL REFERENCES medication_schedules (id) ON DELETE CASCADE,
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  facility_id     TEXT        NOT NULL,
  scheduled_time  TIMESTAMPTZ NOT NULL,                          -- when the dose was expected
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'given', 'skipped', 'missed')),
  administered_at TIMESTAMPTZ,                                   -- when actually given (NULL if not yet)
  administered_by TEXT,                                          -- Cognito sub of the nurse
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dose_logs_schedule   ON dose_logs (schedule_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_resident   ON dose_logs (resident_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_facility   ON dose_logs (facility_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_status     ON dose_logs (status);
CREATE INDEX IF NOT EXISTS idx_dose_logs_sched_time ON dose_logs (scheduled_time);

-- ── updated_at triggers ───────────────────────────────────────────────────
-- set_updated_at() was already created in 001_create_residents.sql

CREATE TRIGGER trg_med_schedules_updated_at
  BEFORE UPDATE ON medication_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_dose_logs_updated_at
  BEFORE UPDATE ON dose_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
