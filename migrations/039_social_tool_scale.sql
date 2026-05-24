-- P9: Link social_assessment_tools to assessment_questions via `scale`.
-- assessment_questions already has a `scale` column (e.g. 'GDS').
-- This migration adds the same column to social_assessment_tools so the API can
-- return questions for a given toolId.

ALTER TABLE social_assessment_tools
  ADD COLUMN IF NOT EXISTS scale TEXT;

-- Seed: assume any existing "psychology/mood" tool maps to GDS questions.
UPDATE social_assessment_tools
   SET scale = 'GDS'
 WHERE scale IS NULL
   AND (name ILIKE '%نفسي%' OR name ILIKE '%GDS%' OR name ILIKE '%depression%');

CREATE INDEX IF NOT EXISTS idx_social_tools_scale
  ON social_assessment_tools (facility_id, scale);
