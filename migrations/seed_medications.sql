-- US-04-01: Seed – sample medication schedules and dose logs
-- Run this after 002_create_medications.sql to populate working demo data.
-- Residents referenced here come from seed_residents.sql (facility-demo).

-- ── Schedule 1: Ahmad's Morning Medication ────────────────────────────────
INSERT INTO medication_schedules (
  id, resident_id, facility_id, medication_name, dosage, route,
  frequency, scheduled_times, start_date, is_active, prescriber, notes
) VALUES (
  'd1000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo',
  'Aspirin 100mg', '1 tablet', 'oral',
  'daily', '{08:00}',
  '2025-01-10', TRUE, 'Dr. Sami',
  'Take with breakfast'
) ON CONFLICT (id) DO NOTHING;

-- ── Schedule 2: Ahmad's Evening Medication ────────────────────────────────
INSERT INTO medication_schedules (
  id, resident_id, facility_id, medication_name, dosage, route,
  frequency, scheduled_times, start_date, is_active, prescriber
) VALUES (
  'd1000000-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo',
  'Metformin 500mg', '1 tablet', 'oral',
  'bid', '{08:00,20:00}',
  '2025-01-10', TRUE, 'Dr. Sami'
) ON CONFLICT (id) DO NOTHING;

-- ── Schedule 3: Fatimah's Blood Pressure Medication ───────────────────────
INSERT INTO medication_schedules (
  id, resident_id, facility_id, medication_name, dosage, route,
  frequency, scheduled_times, start_date, is_active, prescriber
) VALUES (
  'd2000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000002',
  'facility-demo',
  'Amlodipine 5mg', '1 tablet', 'oral',
  'daily', '{09:00}',
  '2025-02-01', TRUE, 'Dr. Layla'
) ON CONFLICT (id) DO NOTHING;

-- ── Schedule 4: Omar's PRN Pain Medication ────────────────────────────────
INSERT INTO medication_schedules (
  id, resident_id, facility_id, medication_name, dosage, route,
  frequency, scheduled_times, start_date, is_active, prescriber, notes
) VALUES (
  'd3000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000003',
  'facility-demo',
  'Paracetamol 500mg', '1-2 tablets', 'oral',
  'prn', '{}',
  '2025-03-15', TRUE, 'Dr. Sami',
  'As needed for pain, max 4g/day'
) ON CONFLICT (id) DO NOTHING;

-- ── Dose Logs for Ahmad's Aspirin (week sample) ──────────────────────────
INSERT INTO dose_logs (
  id, schedule_id, resident_id, facility_id,
  scheduled_time, status, administered_at, administered_by
) VALUES
  -- Monday: given on time
  (
    'e1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'facility-demo',
    '2025-05-05 08:00:00+03', 'given',
    '2025-05-05 08:05:00+03', 'nurse-seed'
  ),
  -- Tuesday: given late
  (
    'e1000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'facility-demo',
    '2025-05-06 08:00:00+03', 'given',
    '2025-05-06 08:45:00+03', 'nurse-seed'
  ),
  -- Wednesday: skipped
  (
    'e1000000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'facility-demo',
    '2025-05-07 08:00:00+03', 'skipped',
    NULL, 'nurse-seed'
  ),
  -- Thursday: still pending (overdue)
  (
    'e1000000-0000-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'facility-demo',
    '2025-05-08 08:00:00+03', 'pending',
    NULL, NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ── Dose Log for Fatimah's Amlodipine (overdue) ──────────────────────────
INSERT INTO dose_logs (
  id, schedule_id, resident_id, facility_id,
  scheduled_time, status
) VALUES (
  'e2000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000002',
  'facility-demo',
  '2025-05-08 09:00:00+03', 'pending'
) ON CONFLICT (id) DO NOTHING;
