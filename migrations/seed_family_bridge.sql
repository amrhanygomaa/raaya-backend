-- US-05-01: Seed – sample media items and visits
-- Run after 003_create_family_bridge.sql.
-- Residents and family_members come from seed_residents.sql (facility-demo).

-- ── Media Items ─────────────────────────────────────────────────────────

-- Ahmad's family photo (confirmed)
INSERT INTO media_items (
  id, resident_id, facility_id, uploaded_by,
  s3_key, file_name, content_type, file_size_bytes,
  status, caption
) VALUES (
  'f1000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo',
  'family-khalid',
  'facility-demo/a1b2c3d4-0000-0000-0000-000000000001/family-gathering.jpg',
  'family-gathering.jpg', 'image/jpeg', 245000,
  'confirmed', 'Family gathering – Eid 2025'
) ON CONFLICT (id) DO NOTHING;

-- Ahmad's audio message (confirmed)
INSERT INTO media_items (
  id, resident_id, facility_id, uploaded_by,
  s3_key, file_name, content_type, file_size_bytes,
  status, caption
) VALUES (
  'f1000000-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo',
  'family-sara',
  'facility-demo/a1b2c3d4-0000-0000-0000-000000000001/voice-note.mp3',
  'voice-note.mp3', 'audio/mpeg', 120000,
  'confirmed', 'Voice message from granddaughter Sara'
) ON CONFLICT (id) DO NOTHING;

-- Fatimah's photo (pending upload)
INSERT INTO media_items (
  id, resident_id, facility_id, uploaded_by,
  s3_key, file_name, content_type,
  status, caption
) VALUES (
  'f2000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000002',
  'facility-demo',
  'family-mohammed',
  'facility-demo/a1b2c3d4-0000-0000-0000-000000000002/garden-walk.jpg',
  'garden-walk.jpg', 'image/jpeg',
  'pending_upload', 'Morning walk in the garden'
) ON CONFLICT (id) DO NOTHING;

-- ── Visits ──────────────────────────────────────────────────────────────

-- Ahmad – approved visit
INSERT INTO visits (
  id, resident_id, facility_id,
  visitor_name, visitor_relationship, booked_by,
  visit_date, visit_time_start, visit_time_end,
  status, approved_by, notes
) VALUES (
  'f3000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo',
  'Khalid Al-Rashid', 'son', 'family-khalid',
  '2025-05-12', '10:00', '11:30',
  'approved', 'admin-seed',
  'Weekly family visit'
) ON CONFLICT (id) DO NOTHING;

-- Ahmad – completed visit
INSERT INTO visits (
  id, resident_id, facility_id,
  visitor_name, visitor_relationship, booked_by,
  visit_date, visit_time_start, visit_time_end,
  status, approved_by
) VALUES (
  'f3000000-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo',
  'Sara Al-Rashid', 'daughter', 'family-sara',
  '2025-05-05', '14:00', '15:00',
  'completed', 'admin-seed'
) ON CONFLICT (id) DO NOTHING;

-- Fatimah – pending visit
INSERT INTO visits (
  id, resident_id, facility_id,
  visitor_name, visitor_relationship, booked_by,
  visit_date, visit_time_start, visit_time_end,
  status, notes
) VALUES (
  'f4000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000002',
  'facility-demo',
  'Mohammed Al-Zahrani', 'son', 'family-mohammed',
  '2025-05-15', '11:00', '12:00',
  'pending',
  'First visit this month'
) ON CONFLICT (id) DO NOTHING;
