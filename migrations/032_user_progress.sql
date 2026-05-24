-- P2: User Progress / Gamification
-- Tracks points, streak, completed activities per user. Upsert by user_id.

CREATE TABLE IF NOT EXISTS user_progress (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT         NOT NULL UNIQUE,
  facility_id           TEXT         NOT NULL,
  points                INTEGER      NOT NULL DEFAULT 0,
  streak_days           INTEGER      NOT NULL DEFAULT 0,
  completed_activities  INTEGER      NOT NULL DEFAULT 0,
  last_activity_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_progress_facility
  ON user_progress (facility_id, points DESC);
