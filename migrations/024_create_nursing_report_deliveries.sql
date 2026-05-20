CREATE TABLE IF NOT EXISTS nursing_report_deliveries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id  TEXT        NOT NULL,
  report_type  TEXT        NOT NULL CHECK (report_type IN ('daily', 'weekly', 'critical', 'medications')),
  recipients   TEXT[]      NOT NULL DEFAULT '{}',
  status       TEXT        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'scheduled', 'failed')),
  sent_by      TEXT        NOT NULL,
  metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nursing_report_deliveries_facility ON nursing_report_deliveries (facility_id);
CREATE INDEX IF NOT EXISTS idx_nursing_report_deliveries_created ON nursing_report_deliveries (created_at DESC);

CREATE TRIGGER trg_nursing_report_deliveries_updated_at
  BEFORE UPDATE ON nursing_report_deliveries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
