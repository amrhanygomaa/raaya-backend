-- P5: Facilities + Public Inquiries
-- `facilities` is the master list shown to unauthenticated visitors.
-- `facility_inquiries` captures lead-form submissions (name + phone + city + features).

CREATE TABLE IF NOT EXISTS facilities (
  id          TEXT         PRIMARY KEY,
  name        TEXT         NOT NULL,
  governorate TEXT         NOT NULL,
  city        TEXT         NOT NULL,
  features    TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facilities_geo
  ON facilities (governorate, city) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_facilities_features
  ON facilities USING GIN (features);

CREATE TABLE IF NOT EXISTS facility_inquiries (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id  TEXT         REFERENCES facilities(id) ON DELETE SET NULL,
  name         TEXT         NOT NULL,
  phone        TEXT         NOT NULL,
  governorate  TEXT         NOT NULL,
  city         TEXT         NOT NULL,
  features     TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  status       TEXT         NOT NULL DEFAULT 'received'
                 CHECK (status IN ('received','contacted','closed','spam')),
  source_ip    TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created
  ON facility_inquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inquiries_phone
  ON facility_inquiries (phone, created_at DESC);
