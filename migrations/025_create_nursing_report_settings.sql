CREATE TABLE IF NOT EXISTS nursing_report_settings (
  id                                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id                       TEXT        NOT NULL UNIQUE,
  daily_time                        TEXT        NOT NULL DEFAULT '08:00',
  weekly_day                        TEXT        NOT NULL DEFAULT 'الجمعة',
  critical_alert_enabled            BOOLEAN     NOT NULL DEFAULT TRUE,
  missed_medication_alert_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
  recipients                        TEXT[]      NOT NULL DEFAULT ARRAY['د. أحمد','الإدارة','الأخصائي'],
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nursing_report_settings_facility ON nursing_report_settings (facility_id);

CREATE TRIGGER trg_nursing_report_settings_updated_at
  BEFORE UPDATE ON nursing_report_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
