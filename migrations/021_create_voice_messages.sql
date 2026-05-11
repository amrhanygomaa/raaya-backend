-- US-15-01: Voice messages table
-- Migration: 021_create_voice_messages.sql
-- Epic: EP-15 | Sprint 11

CREATE TABLE IF NOT EXISTS voice_messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       TEXT        NOT NULL,
  resident_id       UUID        NOT NULL REFERENCES residents (id) ON DELETE CASCADE,
  sender_type       TEXT        NOT NULL CHECK (sender_type IN ('family', 'staff', 'volunteer')),
  title             TEXT        NOT NULL,
  audio_url         TEXT,
  duration_seconds  INT         NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_messages_facility ON voice_messages (facility_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_resident ON voice_messages (resident_id);
