-- P4: AI Media Uploads
-- Used when family/specialist uploads an image/document for AI analysis
-- (medication label, wound photo, prescription, etc.).
-- Mirrors the family-bridge media_items table but scoped to AI use cases.

CREATE TABLE IF NOT EXISTS ai_media (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   TEXT         NOT NULL,
  user_id       TEXT         NOT NULL,
  resident_id   UUID         REFERENCES residents(id) ON DELETE SET NULL,
  file_name     TEXT         NOT NULL,
  content_type  TEXT         NOT NULL,
  s3_key        TEXT         NOT NULL,
  media_url     TEXT,
  notes         TEXT,
  status        TEXT         NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','failed')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  confirmed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_media_facility
  ON ai_media (facility_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_media_resident
  ON ai_media (resident_id, created_at DESC)
  WHERE resident_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_media_user
  ON ai_media (user_id, created_at DESC);
