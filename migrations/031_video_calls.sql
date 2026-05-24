-- P1: Video Calls (Zoom / Agora / Jitsi)
-- Used by family↔resident, nurse↔family, specialist↔family, volunteer↔resident.

CREATE TABLE IF NOT EXISTS video_calls (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   TEXT         NOT NULL,
  resident_id   UUID         REFERENCES residents(id) ON DELETE SET NULL,
  caller_id     TEXT         NOT NULL,
  callee_id     TEXT,
  callee_name   TEXT,
  provider      TEXT         NOT NULL DEFAULT 'zoom',
  join_url      TEXT,
  call_type     TEXT         NOT NULL DEFAULT 'family_video',
  status        TEXT         NOT NULL DEFAULT 'ringing'
                CHECK (status IN ('ringing','active','ended','missed','declined')),
  started_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_calls_facility
  ON video_calls (facility_id);

CREATE INDEX IF NOT EXISTS idx_video_calls_active
  ON video_calls (facility_id, status)
  WHERE status IN ('ringing','active');

CREATE INDEX IF NOT EXISTS idx_video_calls_started
  ON video_calls (facility_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_calls_participants
  ON video_calls (facility_id, caller_id, callee_id, started_at DESC);
