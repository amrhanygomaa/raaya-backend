CREATE TABLE IF NOT EXISTS emergency_alerts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id  TEXT        NOT NULL,
  resident_id  UUID        REFERENCES residents (id) ON DELETE SET NULL,
  triggered_by TEXT        NOT NULL,
  alert_type   TEXT        NOT NULL DEFAULT 'sos',
  status       TEXT        NOT NULL DEFAULT 'active',
  location     TEXT,
  notes        TEXT,
  resolved_by  TEXT,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_facility ON emergency_alerts (facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_alerts (facility_id, status);
