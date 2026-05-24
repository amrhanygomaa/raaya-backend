-- P3: User Preferences
-- One JSONB blob per user. Schema is frontend-owned (language, notification toggles, theme, ...).

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id      TEXT         PRIMARY KEY,
  facility_id  TEXT         NOT NULL,
  preferences  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_facility
  ON user_preferences (facility_id);
