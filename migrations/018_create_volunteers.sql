-- US-14-03: Volunteer system tables (profiles, opportunities, bookings)
-- Migration: 018_create_volunteers.sql
-- Epic: EP-14 | Sprint 10

CREATE TABLE IF NOT EXISTS volunteer_profiles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT        NOT NULL UNIQUE,
  facility_id     TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  bio             TEXT,
  location        TEXT,
  skills          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  hours_logged    INT         NOT NULL DEFAULT 0,
  social_links    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  cv_file_url     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS volunteer_opportunities (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  org             TEXT,
  hours           INT         NOT NULL DEFAULT 0,
  points          INT         NOT NULL DEFAULT 0,
  tags            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  description     TEXT,
  total_slots     INT         NOT NULL DEFAULT 1,
  filled_slots    INT         NOT NULL DEFAULT 0,
  date_info       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS volunteer_bookings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  volunteer_id    UUID        NOT NULL REFERENCES volunteer_profiles (id) ON DELETE CASCADE,
  opportunity_id  UUID        NOT NULL REFERENCES volunteer_opportunities (id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'confirmed', 'done', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vol_profiles_facility    ON volunteer_profiles (facility_id);
CREATE INDEX IF NOT EXISTS idx_vol_opportunities_fac    ON volunteer_opportunities (facility_id);
CREATE INDEX IF NOT EXISTS idx_vol_bookings_volunteer   ON volunteer_bookings (volunteer_id);
CREATE INDEX IF NOT EXISTS idx_vol_bookings_opportunity ON volunteer_bookings (opportunity_id);

CREATE TRIGGER trg_volunteer_profiles_updated_at
  BEFORE UPDATE ON volunteer_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
