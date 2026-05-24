-- P12: Volunteer document uploads (CV, certificates, IDs, etc.)
-- Mirrors ai_media / media_items: pending → confirmed via S3 presigned PUT.

CREATE TABLE IF NOT EXISTS volunteer_documents (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   TEXT         NOT NULL,
  user_id       TEXT         NOT NULL,
  document_type TEXT         NOT NULL,
  file_name     TEXT         NOT NULL,
  content_type  TEXT         NOT NULL,
  s3_key        TEXT         NOT NULL,
  file_url      TEXT,
  status        TEXT         NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','failed')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  confirmed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_volunteer_documents_user
  ON volunteer_documents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_volunteer_documents_facility
  ON volunteer_documents (facility_id, created_at DESC);
