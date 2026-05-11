-- US-15-03: Family bills table
-- Migration: 022_create_family_bills.sql
-- Epic: EP-15 | Sprint 11

CREATE TABLE IF NOT EXISTS family_bills (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  month           TEXT        NOT NULL,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_paid         BOOLEAN     NOT NULL DEFAULT FALSE,
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_bills_facility ON family_bills (facility_id);
CREATE INDEX IF NOT EXISTS idx_family_bills_resident ON family_bills (resident_id);
CREATE INDEX IF NOT EXISTS idx_family_bills_paid     ON family_bills (is_paid);
