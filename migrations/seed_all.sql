-- US-10-06: Master seed script – populates the full demo environment.
-- Run after all 001–006 schema migrations.
-- Usage:  psql "$DATABASE_URL" -f migrations/seed_all.sql
--
-- Order matters: residents → family/linked-records → medications →
-- health → complaints → family-bridge → admin/settings → notifications.
-- Every INSERT uses ON CONFLICT … DO NOTHING so re-running is safe.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
--  1. RESIDENTS  (seed_residents.sql)
-- ═══════════════════════════════════════════════════════════════════════

-- Resident 1: Ahmad Al-Rashid
INSERT INTO residents (
  id, facility_id, first_name, last_name, date_of_birth,
  gender, national_id, room_number, admission_date, status
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo',
  'Ahmad', 'Al-Rashid',
  '1940-03-15',
  'male', '1234567890', '101',
  '2025-01-10', 'active'
) ON CONFLICT (id) DO NOTHING;

-- Resident 2: Fatimah Al-Zahrani
INSERT INTO residents (
  id, facility_id, first_name, last_name, date_of_birth,
  gender, national_id, room_number, admission_date, status
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000002',
  'facility-demo',
  'Fatimah', 'Al-Zahrani',
  '1935-07-20',
  'female', '0987654321', '205',
  '2025-02-01', 'active'
) ON CONFLICT (id) DO NOTHING;

-- Resident 3: Omar Al-Ghamdi (AI demo resident)
INSERT INTO residents (
  id, facility_id, first_name, last_name, date_of_birth,
  gender, room_number, admission_date, status, notes
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000003',
  'facility-demo',
  'Omar', 'Al-Ghamdi',
  '1942-11-05',
  'male', '312',
  '2025-03-15', 'active',
  'Demo resident used by the AI weekly summary job (DEMO_RESIDENT_ID=demo-resident)'
) ON CONFLICT (id) DO NOTHING;

-- Family members
INSERT INTO family_members (
  id, resident_id, full_name, relationship, phone, email, is_primary
) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'Khalid Al-Rashid', 'son', '+966501234567', 'khalid@example.sa', TRUE),
  ('b1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
   'Sara Al-Rashid', 'daughter', '+966509876543', 'sara@example.sa', FALSE),
  ('b2000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000002',
   'Mohammed Al-Zahrani', 'son', '+966502345678', 'mohammed@example.sa', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Linked records
INSERT INTO linked_records (
  id, resident_id, record_type, title, content, recorded_by
) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'medication', 'Morning Medication',
   '{"drugs": ["Aspirin 100mg", "Metformin 500mg"], "frequency": "daily", "time": "08:00"}',
   'system-seed'),
  ('c1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
   'diagnosis', 'Primary Diagnoses',
   '{"conditions": ["Type 2 Diabetes", "Hypertension"], "icd10": ["E11", "I10"]}',
   'system-seed'),
  ('c2000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000002',
   'care_plan', 'Weekly Care Plan',
   '{"goals": ["Improve mobility", "Monitor blood pressure"], "review_date": "2025-06-01"}',
   'system-seed')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
--  2. MEDICATIONS  (seed_medications.sql)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO medication_schedules (
  id, resident_id, facility_id, medication_name, dosage, route,
  frequency, scheduled_times, start_date, is_active, prescriber, notes
) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'facility-demo', 'Aspirin 100mg', '1 tablet', 'oral',
   'daily', '{08:00}', '2025-01-10', TRUE, 'Dr. Sami', 'Take with breakfast')
ON CONFLICT (id) DO NOTHING;

INSERT INTO medication_schedules (
  id, resident_id, facility_id, medication_name, dosage, route,
  frequency, scheduled_times, start_date, is_active, prescriber
) VALUES
  ('d1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
   'facility-demo', 'Metformin 500mg', '1 tablet', 'oral',
   'bid', '{08:00,20:00}', '2025-01-10', TRUE, 'Dr. Sami'),
  ('d2000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000002',
   'facility-demo', 'Amlodipine 5mg', '1 tablet', 'oral',
   'daily', '{09:00}', '2025-02-01', TRUE, 'Dr. Layla')
ON CONFLICT (id) DO NOTHING;

INSERT INTO medication_schedules (
  id, resident_id, facility_id, medication_name, dosage, route,
  frequency, scheduled_times, start_date, is_active, prescriber, notes
) VALUES
  ('d3000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000003',
   'facility-demo', 'Paracetamol 500mg', '1-2 tablets', 'oral',
   'prn', '{}', '2025-03-15', TRUE, 'Dr. Sami', 'As needed for pain, max 4g/day')
ON CONFLICT (id) DO NOTHING;

-- Dose logs
INSERT INTO dose_logs (
  id, schedule_id, resident_id, facility_id,
  scheduled_time, status, administered_at, administered_by
) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001',
   'a1b2c3d4-0000-0000-0000-000000000001', 'facility-demo',
   '2025-05-05 08:00:00+03', 'given', '2025-05-05 08:05:00+03', 'nurse-seed'),
  ('e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001',
   'a1b2c3d4-0000-0000-0000-000000000001', 'facility-demo',
   '2025-05-06 08:00:00+03', 'given', '2025-05-06 08:45:00+03', 'nurse-seed'),
  ('e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001',
   'a1b2c3d4-0000-0000-0000-000000000001', 'facility-demo',
   '2025-05-07 08:00:00+03', 'skipped', NULL, 'nurse-seed'),
  ('e1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001',
   'a1b2c3d4-0000-0000-0000-000000000001', 'facility-demo',
   '2025-05-08 08:00:00+03', 'pending', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dose_logs (
  id, schedule_id, resident_id, facility_id, scheduled_time, status
) VALUES
  ('e2000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001',
   'a1b2c3d4-0000-0000-0000-000000000002', 'facility-demo',
   '2025-05-08 09:00:00+03', 'pending')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
--  3. HEALTH / VITALS  (seed_health.sql)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO vital_thresholds (id, facility_id, vital_type, min_value, max_value, unit) VALUES
  ('th000000-0000-0000-0000-000000000001', 'facility-demo', 'heart_rate',                60,  100, 'bpm'),
  ('th000000-0000-0000-0000-000000000002', 'facility-demo', 'blood_pressure_systolic',    90,  140, 'mmHg'),
  ('th000000-0000-0000-0000-000000000003', 'facility-demo', 'blood_pressure_diastolic',   60,   90, 'mmHg'),
  ('th000000-0000-0000-0000-000000000004', 'facility-demo', 'temperature',              36.0, 37.5, '°C'),
  ('th000000-0000-0000-0000-000000000005', 'facility-demo', 'respiratory_rate',           12,   20, 'breaths/min'),
  ('th000000-0000-0000-0000-000000000006', 'facility-demo', 'oxygen_saturation',          95, NULL, '%'),
  ('th000000-0000-0000-0000-000000000007', 'facility-demo', 'blood_glucose',              70,  140, 'mg/dL')
ON CONFLICT (facility_id, vital_type) DO NOTHING;

-- Ahmad – normal reading
INSERT INTO vital_signs (
  id, resident_id, facility_id, recorded_by, recorded_at,
  heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
  temperature, respiratory_rate, oxygen_saturation, blood_glucose, notes
) VALUES (
  'vs000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo', 'nurse-seed', '2025-05-08 08:00:00+03',
  72, 120, 80, 36.8, 16, 98, 95,
  'Morning check – all normal'
) ON CONFLICT (id) DO NOTHING;

-- Ahmad – abnormal reading (high HR + low O2)
INSERT INTO vital_signs (
  id, resident_id, facility_id, recorded_by, recorded_at,
  heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
  temperature, respiratory_rate, oxygen_saturation, notes
) VALUES (
  'vs000000-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo', 'nurse-seed', '2025-05-08 14:00:00+03',
  110, 135, 85, 37.1, 18, 92,
  'Post-lunch check – elevated HR, low SpO2'
) ON CONFLICT (id) DO NOTHING;

-- Fatimah – normal reading
INSERT INTO vital_signs (
  id, resident_id, facility_id, recorded_by, recorded_at,
  heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
  temperature, respiratory_rate, oxygen_saturation
) VALUES (
  'vs000000-0000-0000-0000-000000000003',
  'a1b2c3d4-0000-0000-0000-000000000002',
  'facility-demo', 'nurse-seed', '2025-05-08 09:00:00+03',
  68, 125, 78, 36.6, 14, 97
) ON CONFLICT (id) DO NOTHING;

-- Vital alerts (from Ahmad's abnormal reading)
INSERT INTO vital_alerts (
  id, vital_sign_id, resident_id, facility_id,
  vital_type, recorded_value, threshold_min, threshold_max,
  severity, status
) VALUES
  ('va000000-0000-0000-0000-000000000001', 'vs000000-0000-0000-0000-000000000002',
   'a1b2c3d4-0000-0000-0000-000000000001', 'facility-demo',
   'heart_rate', 110, 60, 100, 'warning', 'active'),
  ('va000000-0000-0000-0000-000000000002', 'vs000000-0000-0000-0000-000000000002',
   'a1b2c3d4-0000-0000-0000-000000000001', 'facility-demo',
   'oxygen_saturation', 92, 95, NULL, 'warning', 'active')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
--  4. COMPLAINTS  (seed_complaints.sql)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO complaints (
  id, resident_id, facility_id, submitted_by,
  category, subject, description,
  status, priority, resolved_by, resolved_at, resolution_notes
) VALUES
  ('cp000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'facility-demo', 'family-khalid',
   'food', 'Meal quality concern', 'Meals not served at consistent temperature',
   'resolved', 'medium', 'admin-seed', '2025-05-06 10:00:00+03',
   'Kitchen team briefed; temperature checks implemented'),
  ('cp000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
   'facility-demo', 'family-sara',
   'communication', 'Delayed update on medication change',
   'Family was not notified about a dosage change for 3 days',
   'closed', 'high', 'admin-seed', '2025-05-04 14:00:00+03',
   'Communication protocol updated; family notified within 24h going forward')
ON CONFLICT (id) DO NOTHING;

INSERT INTO complaints (
  id, resident_id, facility_id, submitted_by,
  category, subject, description, status, priority
) VALUES
  ('cp000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000002',
   'facility-demo', 'family-mohammed',
   'care_quality', 'Physical therapy schedule concern',
   'Resident missed two PT sessions last week', 'open', 'high'),
  ('cp000000-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000002',
   'facility-demo', 'family-mohammed',
   'facility', 'Room temperature too cold',
   'Room 205 AC is set too low at night', 'in_progress', 'low')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
--  5. FAMILY BRIDGE – media & visits  (seed_family_bridge.sql)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO media_items (
  id, resident_id, facility_id, uploaded_by,
  s3_key, file_name, content_type, file_size_bytes, status, caption
) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'facility-demo', 'family-khalid',
   'facility-demo/a1b2c3d4-0000-0000-0000-000000000001/family-gathering.jpg',
   'family-gathering.jpg', 'image/jpeg', 245000,
   'confirmed', 'Family gathering – Eid 2025'),
  ('f1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
   'facility-demo', 'family-sara',
   'facility-demo/a1b2c3d4-0000-0000-0000-000000000001/voice-note.mp3',
   'voice-note.mp3', 'audio/mpeg', 120000,
   'confirmed', 'Voice message from granddaughter Sara')
ON CONFLICT (id) DO NOTHING;

INSERT INTO media_items (
  id, resident_id, facility_id, uploaded_by,
  s3_key, file_name, content_type, status, caption
) VALUES
  ('f2000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000002',
   'facility-demo', 'family-mohammed',
   'facility-demo/a1b2c3d4-0000-0000-0000-000000000002/garden-walk.jpg',
   'garden-walk.jpg', 'image/jpeg',
   'pending_upload', 'Morning walk in the garden')
ON CONFLICT (id) DO NOTHING;

INSERT INTO visits (
  id, resident_id, facility_id,
  visitor_name, visitor_relationship, booked_by,
  visit_date, visit_time_start, visit_time_end,
  status, approved_by, notes
) VALUES
  ('f3000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'facility-demo', 'Khalid Al-Rashid', 'son', 'family-khalid',
   '2025-05-12', '10:00', '11:30', 'approved', 'admin-seed', 'Weekly family visit')
ON CONFLICT (id) DO NOTHING;

INSERT INTO visits (
  id, resident_id, facility_id,
  visitor_name, visitor_relationship, booked_by,
  visit_date, visit_time_start, visit_time_end,
  status, approved_by
) VALUES
  ('f3000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
   'facility-demo', 'Sara Al-Rashid', 'daughter', 'family-sara',
   '2025-05-05', '14:00', '15:00', 'completed', 'admin-seed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO visits (
  id, resident_id, facility_id,
  visitor_name, visitor_relationship, booked_by,
  visit_date, visit_time_start, visit_time_end,
  status, notes
) VALUES
  ('f4000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000002',
   'facility-demo', 'Mohammed Al-Zahrani', 'son', 'family-mohammed',
   '2025-05-15', '11:00', '12:00', 'pending', 'First visit this month')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
--  6. ADMIN MANAGEMENT – users & facility settings  (seed_admin_management.sql)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO managed_users (
  id, cognito_sub, facility_id, email, full_name, role, status, created_by
) VALUES
  ('ad000000-0000-0000-0000-000000000001', 'admin-seed', 'facility-demo',
   'admin@raaya.demo', 'Demo Admin', 'Admin', 'active', 'seed'),
  ('ad000000-0000-0000-0000-000000000002', 'nurse-seed', 'facility-demo',
   'nurse@raaya.demo', 'Demo Nurse', 'Nurse', 'active', 'seed'),
  ('ad000000-0000-0000-0000-000000000003', 'disabled-user-seed', 'facility-demo',
   'disabled@raaya.demo', 'Disabled Demo User', 'ClinicalStaff', 'disabled', 'seed')
ON CONFLICT (facility_id, email) DO NOTHING;

INSERT INTO facility_settings (
  id, facility_id,
  medication_reminder_minutes_before, visit_reminder_hours_before,
  alert_push_enabled, timezone, vital_thresholds, updated_by
) VALUES (
  'fs000000-0000-0000-0000-000000000001',
  'facility-demo',
  30, 24, TRUE, 'Asia/Riyadh',
  '{
    "heart_rate": { "minValue": 60, "maxValue": 100, "unit": "bpm" },
    "blood_pressure_systolic": { "minValue": 90, "maxValue": 140, "unit": "mmHg" },
    "oxygen_saturation": { "minValue": 95, "unit": "%" }
  }'::jsonb,
  'seed'
) ON CONFLICT (facility_id) DO NOTHING;

COMMIT;
