CREATE TABLE IF NOT EXISTS managed_users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_sub     TEXT        UNIQUE,
  facility_id     TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  full_name       TEXT        NOT NULL,
  role            TEXT        NOT NULL CHECK (role IN ('Admin', 'Doctor', 'Nurse', 'ClinicalStaff', 'Family')),
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_by      TEXT        NOT NULL,
  disabled_by     TEXT,
  disabled_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (facility_id, email)
);

CREATE INDEX IF NOT EXISTS idx_managed_users_facility ON managed_users (facility_id);
CREATE INDEX IF NOT EXISTS idx_managed_users_status   ON managed_users (status);
CREATE INDEX IF NOT EXISTS idx_managed_users_role     ON managed_users (role);

CREATE TABLE IF NOT EXISTS facility_settings (
  id                                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id                         TEXT        NOT NULL UNIQUE,
  medication_reminder_minutes_before  INT         NOT NULL DEFAULT 30 CHECK (medication_reminder_minutes_before >= 0),
  visit_reminder_hours_before         INT         NOT NULL DEFAULT 24 CHECK (visit_reminder_hours_before >= 0),
  alert_push_enabled                  BOOLEAN     NOT NULL DEFAULT TRUE,
  timezone                            TEXT        NOT NULL DEFAULT 'Asia/Riyadh',
  vital_thresholds                    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_by                          TEXT,
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facility_settings_facility ON facility_settings (facility_id);

CREATE TRIGGER trg_managed_users_updated_at
  BEFORE UPDATE ON managed_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_facility_settings_updated_at
  BEFORE UPDATE ON facility_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
