-- US-14-04: Volunteer certificates, ratings, reviews
-- Migration: 019_create_volunteer_ratings.sql
-- Epic: EP-14 | Sprint 11

CREATE TABLE IF NOT EXISTS volunteer_certificates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id    UUID        NOT NULL REFERENCES volunteer_profiles (id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  award_date      DATE,
  description     TEXT,
  is_locked       BOOLEAN     NOT NULL DEFAULT TRUE,
  progress        INT         NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS volunteer_ratings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id    UUID        NOT NULL REFERENCES volunteer_profiles (id) ON DELETE CASCADE,
  from_name       TEXT        NOT NULL,
  category        TEXT,
  score           NUMERIC(3,1) NOT NULL DEFAULT 0,
  comment         TEXT,
  date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  chips           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  criteria_scores JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS volunteer_reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id    UUID        NOT NULL REFERENCES volunteer_profiles (id) ON DELETE CASCADE,
  to_name         TEXT        NOT NULL,
  session         TEXT,
  date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  score           NUMERIC(3,1) NOT NULL DEFAULT 0,
  is_pending      BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_vol_certs_volunteer    ON volunteer_certificates (volunteer_id);
CREATE INDEX IF NOT EXISTS idx_vol_ratings_volunteer   ON volunteer_ratings (volunteer_id);
CREATE INDEX IF NOT EXISTS idx_vol_reviews_volunteer   ON volunteer_reviews (volunteer_id);
