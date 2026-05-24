-- P11: Volunteer public profile share links
-- Lets a volunteer generate a tokenized URL to share their profile externally.
-- A new row is created on each POST so old tokens can be revoked / expire independently.

CREATE TABLE IF NOT EXISTS volunteer_public_links (
  token       TEXT         PRIMARY KEY,
  user_id     TEXT         NOT NULL,
  facility_id TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ  NOT NULL,
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vp_links_user
  ON volunteer_public_links (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vp_links_expires
  ON volunteer_public_links (expires_at) WHERE revoked_at IS NULL;
