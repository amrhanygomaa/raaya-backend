-- US-12-03: Shift handoffs table for nursing workflow
-- Migration: 008_create_shift_handoffs.sql
-- Epic: EP-12 | Sprint 8

CREATE TABLE IF NOT EXISTS shift_handoffs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id         TEXT        NOT NULL,
  outgoing_nurse_id   TEXT        NOT NULL,
  incoming_nurse_id   TEXT        NOT NULL,
  shift_date          DATE        NOT NULL,
  shift_type          TEXT        NOT NULL DEFAULT 'morning'
                                  CHECK (shift_type IN ('morning', 'evening', 'night')),
  summary             TEXT        NOT NULL,
  residents_covered   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  pending_tasks       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_handoffs_facility ON shift_handoffs (facility_id);
CREATE INDEX IF NOT EXISTS idx_shift_handoffs_date     ON shift_handoffs (shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_handoffs_outgoing ON shift_handoffs (outgoing_nurse_id);
