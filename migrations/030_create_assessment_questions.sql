CREATE TABLE IF NOT EXISTS assessment_questions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id  TEXT,
  scale        TEXT        NOT NULL DEFAULT 'GDS',
  sort_order   INT         NOT NULL DEFAULT 0,
  question_key TEXT        NOT NULL,
  text_ar      TEXT        NOT NULL,
  question_type TEXT       NOT NULL CHECK (question_type IN ('choice', 'scale', 'text')),
  options      JSONB,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aq_scale ON assessment_questions (scale, sort_order);

-- Seed with the 8 GDS questions (global, facility_id = NULL)
INSERT INTO assessment_questions (facility_id, scale, sort_order, question_key, text_ar, question_type, options)
VALUES
  (NULL, 'GDS', 1, 'gds_q1', 'هل تشعر بأساس من الرضا عن حياتك؟', 'choice', '["نعم","لا"]'),
  (NULL, 'GDS', 2, 'gds_q2', 'هل تركت الكثير من أنشطتك واهتماماتك؟', 'choice', '["نعم","لا"]'),
  (NULL, 'GDS', 3, 'gds_q3', 'هل تشعر أن حياتك فارغة؟', 'choice', '["نعم","لا"]'),
  (NULL, 'GDS', 4, 'gds_q4', 'هل تشعر بالملل في كثير من الأحيان؟', 'choice', '["نعم","لا"]'),
  (NULL, 'GDS', 5, 'gds_q5', 'هل تشعر بالروح المعنوية الجيدة في معظم الأوقات؟', 'choice', '["نعم","لا"]'),
  (NULL, 'GDS', 6, 'gds_q6', 'هل تشعر بالقلق وأن هناك أشياء سيئة ستحدث لك؟', 'choice', '["نعم — أحياناً","لا — نادراً","أحياناً جداً"]'),
  (NULL, 'GDS', 7, 'gds_q7', 'كيف تقيّم مزاجك العام خلال الأسبوع الماضي؟', 'scale', NULL),
  (NULL, 'GDS', 8, 'gds_q8', 'هل تشعر أنك عاجز عن مساعدة الآخرين؟ اشرح بكلماتك:', 'text', NULL)
ON CONFLICT DO NOTHING;
