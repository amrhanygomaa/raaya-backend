CREATE TABLE IF NOT EXISTS ai_resident_memory (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  facts       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_memory_resident ON ai_resident_memory (resident_id);
