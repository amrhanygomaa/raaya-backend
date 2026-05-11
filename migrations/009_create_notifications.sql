-- US-15-07: Notifications table – persist to PostgreSQL
-- Migration: 009_create_notifications.sql
-- Epic: EP-15 | Sprint 8

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     TEXT        NOT NULL,
  user_id         TEXT        NOT NULL,
  message         TEXT        NOT NULL,
  type            TEXT        NOT NULL DEFAULT 'medication_reminder'
                              CHECK (type IN (
                                'medication_reminder', 'vital_alert', 'complaint',
                                'visit_reminder', 'ai_summary'
                              )),
  read            BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_facility ON notifications (facility_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read     ON notifications (read);
