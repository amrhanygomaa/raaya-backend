-- Add media attachment support to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media_url  TEXT,
  ADD COLUMN IF NOT EXISTS media_type VARCHAR(100);
