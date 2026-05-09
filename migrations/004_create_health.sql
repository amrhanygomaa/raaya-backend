-- US-06-01: HealthModule – vital signs, alerts, and thresholds
-- Migration: 004_create_health.sql
-- Epic: EP-06 | Sprint 4 (Weeks 7-8)
--
-- Creates vital_signs, vital_alerts, and vital_thresholds tables
-- so that staff can record vitals and abnormal values trigger alerts.

-- ── Vital-Sign Thresholds ───────────────────────────────────────────────
-- One row per vital type per facility. Editable by Admin.
CREATE TABLE IF NOT EXISTS vital_thresholds (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  vital_type      TEXT        NOT NULL,                           -- e.g. 'heart_rate', 'blood_pressure_systolic'
  min_value       NUMERIC,                                       -- NULL = no lower bound
  max_value       NUMERIC,                                       -- NULL = no upper bound
  unit            TEXT        NOT NULL DEFAULT '',                -- e.g. 'bpm', 'mmHg', '°C'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (facility_id, vital_type)
);

CREATE INDEX IF NOT EXISTS idx_vital_thresholds_facility ON vital_thresholds (facility_id);

-- ── Vital Signs ─────────────────────────────────────────────────────────
-- Each row is a single vital-sign reading for a resident.
CREATE TABLE IF NOT EXISTS vital_signs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  facility_id     TEXT        NOT NULL,
  recorded_by     TEXT        NOT NULL,                           -- Cognito sub
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  heart_rate           NUMERIC,    -- bpm
  blood_pressure_systolic  NUMERIC, -- mmHg
  blood_pressure_diastolic NUMERIC, -- mmHg
  temperature          NUMERIC,    -- °C
  respiratory_rate     NUMERIC,    -- breaths/min
  oxygen_saturation    NUMERIC,    -- %
  blood_glucose        NUMERIC,    -- mg/dL
  weight               NUMERIC,    -- kg
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vital_signs_resident   ON vital_signs (resident_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_facility   ON vital_signs (facility_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded   ON vital_signs (recorded_at);

-- ── Vital Alerts ────────────────────────────────────────────────────────
-- Auto-created when a vital reading is out of threshold range.
CREATE TABLE IF NOT EXISTS vital_alerts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vital_sign_id   UUID        NOT NULL REFERENCES vital_signs (id) ON DELETE CASCADE,
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  facility_id     TEXT        NOT NULL,
  vital_type      TEXT        NOT NULL,                           -- which vital triggered it
  recorded_value  NUMERIC     NOT NULL,
  threshold_min   NUMERIC,
  threshold_max   NUMERIC,
  severity        TEXT        NOT NULL DEFAULT 'warning'
                              CHECK (severity IN ('warning', 'critical')),
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vital_alerts_resident   ON vital_alerts (resident_id);
CREATE INDEX IF NOT EXISTS idx_vital_alerts_facility   ON vital_alerts (facility_id);
CREATE INDEX IF NOT EXISTS idx_vital_alerts_status     ON vital_alerts (status);
CREATE INDEX IF NOT EXISTS idx_vital_alerts_vital_sign ON vital_alerts (vital_sign_id);

-- ── updated_at triggers ─────────────────────────────────────────────────

CREATE TRIGGER trg_vital_thresholds_updated_at
  BEFORE UPDATE ON vital_thresholds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vital_signs_updated_at
  BEFORE UPDATE ON vital_signs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vital_alerts_updated_at
  BEFORE UPDATE ON vital_alerts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
