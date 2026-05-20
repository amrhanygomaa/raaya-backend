CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id TEXT        NOT NULL,
  user_id     TEXT        NOT NULL,
  token       TEXT        NOT NULL,
  platform    TEXT        NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_user_token ON push_tokens (user_id, token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_facility ON push_tokens (facility_id, user_id);
