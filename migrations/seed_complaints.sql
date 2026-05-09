-- US-07-01: Seed – sample complaints for KPI metrics
-- Run after 005_create_complaints.sql.

-- Resolved complaint
INSERT INTO complaints (
  id, resident_id, facility_id, submitted_by,
  category, subject, description,
  status, priority, resolved_by, resolved_at, resolution_notes
) VALUES (
  'cp000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo', 'family-khalid',
  'food', 'Meal quality concern', 'Meals not served at consistent temperature',
  'resolved', 'medium', 'admin-seed', '2025-05-06 10:00:00+03',
  'Kitchen team briefed; temperature checks implemented'
) ON CONFLICT (id) DO NOTHING;

-- Closed complaint
INSERT INTO complaints (
  id, resident_id, facility_id, submitted_by,
  category, subject, description,
  status, priority, resolved_by, resolved_at, resolution_notes
) VALUES (
  'cp000000-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo', 'family-sara',
  'communication', 'Delayed update on medication change', 'Family was not notified about a dosage change for 3 days',
  'closed', 'high', 'admin-seed', '2025-05-04 14:00:00+03',
  'Communication protocol updated; family notified within 24h going forward'
) ON CONFLICT (id) DO NOTHING;

-- Open complaint
INSERT INTO complaints (
  id, resident_id, facility_id, submitted_by,
  category, subject, description,
  status, priority
) VALUES (
  'cp000000-0000-0000-0000-000000000003',
  'a1b2c3d4-0000-0000-0000-000000000002',
  'facility-demo', 'family-mohammed',
  'care_quality', 'Physical therapy schedule concern', 'Resident missed two PT sessions last week',
  'open', 'high'
) ON CONFLICT (id) DO NOTHING;

-- In-progress complaint
INSERT INTO complaints (
  id, resident_id, facility_id, submitted_by,
  category, subject, description,
  status, priority
) VALUES (
  'cp000000-0000-0000-0000-000000000004',
  'a1b2c3d4-0000-0000-0000-000000000002',
  'facility-demo', 'family-mohammed',
  'facility', 'Room temperature too cold', 'Room 205 AC is set too low at night',
  'in_progress', 'low'
) ON CONFLICT (id) DO NOTHING;
