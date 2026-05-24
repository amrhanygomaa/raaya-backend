-- P6: Staff Reviews
-- Reviews left for managed staff members (nurses, specialists, doctors).
-- Volunteer reviews live in `volunteer_reviews` already.

CREATE TABLE IF NOT EXISTS staff_reviews (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   TEXT         NOT NULL,
  staff_id      TEXT         NOT NULL,
  from_user_id  TEXT         NOT NULL,
  from_name     TEXT         NOT NULL,
  from_role     TEXT         NOT NULL,
  rating        NUMERIC(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  comment       TEXT         NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_reviews_staff
  ON staff_reviews (facility_id, staff_id, created_at DESC);
