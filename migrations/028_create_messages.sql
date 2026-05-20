CREATE TABLE IF NOT EXISTS messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id  TEXT        NOT NULL,
  resident_id  UUID        REFERENCES residents (id) ON DELETE CASCADE,
  sender_id    TEXT        NOT NULL,
  sender_role  TEXT        NOT NULL,
  recipient_id TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages (facility_id, resident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages (facility_id, recipient_id, is_read);
