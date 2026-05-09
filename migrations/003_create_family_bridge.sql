-- US-05-01: Family Bridge – media items and visits
-- Migration: 003_create_family_bridge.sql
-- Epic: EP-05 | Sprint 3-4 (Weeks 5-8)
--
-- Creates media_items and visits tables so that family members can
-- upload photos/audio, book visits, and staff can approve them.

-- ── Media Items ─────────────────────────────────────────────────────────
-- Each row tracks a file uploaded to S3 by a family member or staff.
CREATE TABLE IF NOT EXISTS media_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id     UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  facility_id     TEXT        NOT NULL,
  uploaded_by     TEXT        NOT NULL,                           -- Cognito sub
  s3_key          TEXT        NOT NULL,                           -- full S3 object key
  file_name       TEXT        NOT NULL,                           -- original file name
  content_type    TEXT        NOT NULL DEFAULT 'image/jpeg',      -- MIME type
  file_size_bytes BIGINT,
  status          TEXT        NOT NULL DEFAULT 'pending_upload'
                              CHECK (status IN ('pending_upload', 'confirmed', 'rejected')),
  caption         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_items_resident   ON media_items (resident_id);
CREATE INDEX IF NOT EXISTS idx_media_items_facility   ON media_items (facility_id);
CREATE INDEX IF NOT EXISTS idx_media_items_status     ON media_items (status);
CREATE INDEX IF NOT EXISTS idx_media_items_uploaded_by ON media_items (uploaded_by);

-- ── Visits ──────────────────────────────────────────────────────────────
-- Each row is a visit booking made by a family member or staff.
CREATE TABLE IF NOT EXISTS visits (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id         UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  facility_id         TEXT        NOT NULL,
  visitor_name        TEXT        NOT NULL,
  visitor_relationship TEXT       NOT NULL,                       -- e.g. 'son', 'daughter'
  booked_by           TEXT        NOT NULL,                       -- Cognito sub
  visit_date          DATE        NOT NULL,
  visit_time_start    TEXT        NOT NULL,                       -- HH:mm
  visit_time_end      TEXT        NOT NULL,                       -- HH:mm
  status              TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN (
                                'pending', 'approved', 'rejected',
                                'completed', 'cancelled'
                              )),
  approved_by         TEXT,                                       -- Cognito sub of approver
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_resident    ON visits (resident_id);
CREATE INDEX IF NOT EXISTS idx_visits_facility    ON visits (facility_id);
CREATE INDEX IF NOT EXISTS idx_visits_status      ON visits (status);
CREATE INDEX IF NOT EXISTS idx_visits_date        ON visits (visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_booked_by   ON visits (booked_by);

-- ── updated_at triggers ─────────────────────────────────────────────────
-- set_updated_at() was created in 001_create_residents.sql

CREATE TRIGGER trg_media_items_updated_at
  BEFORE UPDATE ON media_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_visits_updated_at
  BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
