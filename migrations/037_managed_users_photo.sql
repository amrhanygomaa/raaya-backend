-- P7: Staff profile photo storage
-- Adds image_url to managed_users so admins can upload a profile photo per staff member.
-- The actual binary lives in S3; this column stores the public URL after confirm.

ALTER TABLE managed_users
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS managed_users_photo_uploads (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id TEXT         NOT NULL,
  user_id     TEXT         NOT NULL,
  s3_key      TEXT         NOT NULL,
  status      TEXT         NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_managed_users_photo_uploads_user
  ON managed_users_photo_uploads (user_id, created_at DESC);
