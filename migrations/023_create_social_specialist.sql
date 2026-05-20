CREATE TABLE IF NOT EXISTS social_needs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  type            TEXT        NOT NULL,
  room_number     TEXT        NOT NULL,
  is_urgent       BOOLEAN     NOT NULL DEFAULT FALSE,
  label           TEXT        NOT NULL,
  created_by      TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_assessment_tools (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  subtitle         TEXT,
  score           TEXT        NOT NULL DEFAULT '0/10',
  status          TEXT        NOT NULL DEFAULT 'جديد',
  icon            TEXT        NOT NULL DEFAULT 'assessment',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_assessments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id         TEXT        NOT NULL,
  resident_id         UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  scores              JSONB       NOT NULL DEFAULT '{}'::jsonb,
  needs_intervention  BOOLEAN     NOT NULL DEFAULT FALSE,
  notes               TEXT,
  assessed_by         TEXT        NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_needs_facility ON social_needs (facility_id);
CREATE INDEX IF NOT EXISTS idx_social_needs_urgent ON social_needs (is_urgent);
CREATE INDEX IF NOT EXISTS idx_social_tools_facility ON social_assessment_tools (facility_id);
CREATE INDEX IF NOT EXISTS idx_social_assessments_facility ON social_assessments (facility_id);
CREATE INDEX IF NOT EXISTS idx_social_assessments_resident ON social_assessments (resident_id);
