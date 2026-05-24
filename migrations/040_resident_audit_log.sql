-- P10: Resident audit log
-- Records every mutation against a resident (create, update, medical_info, status change).
-- Read endpoint: GET /residents/:id/audit-trail
-- Backfill (future): insert into this table from the existing POST /residents and PATCH /residents/:id paths.

CREATE TABLE IF NOT EXISTS resident_audit_log (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT         NOT NULL,
  resident_id     UUID         NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  actor_id        TEXT         NOT NULL,
  actor_name      TEXT         NOT NULL,
  actor_role      TEXT         NOT NULL,
  action          TEXT         NOT NULL,
  changed_fields  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rau_resident
  ON resident_audit_log (resident_id, at DESC);

CREATE INDEX IF NOT EXISTS idx_rau_facility
  ON resident_audit_log (facility_id, at DESC);

CREATE INDEX IF NOT EXISTS idx_rau_action
  ON resident_audit_log (facility_id, action, at DESC);
