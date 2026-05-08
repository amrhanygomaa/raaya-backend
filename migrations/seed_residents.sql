-- US-03-01: Seed – sample residents, family members, and linked records
-- Run this after 001_create_residents.sql to populate working demo data.

-- ── Demo Facility ─────────────────────────────────────────────────────────
-- facility_id matches DEMO_RESIDENT_ID context used in the AI module

-- ── Resident 1: Ahmad Al-Rashid ───────────────────────────────────────────
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

-- Family for Ahmad
INSERT INTO family_members (
  id, resident_id, full_name, relationship, phone, email, is_primary
) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Khalid Al-Rashid', 'son',
    '+966501234567', 'khalid@example.sa', TRUE
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Sara Al-Rashid', 'daughter',
    '+966509876543', 'sara@example.sa', FALSE
  )
ON CONFLICT (id) DO NOTHING;

-- Linked records for Ahmad
INSERT INTO linked_records (
  id, resident_id, record_type, title, content, recorded_by
) VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'medication', 'Morning Medication',
    '{"drugs": ["Aspirin 100mg", "Metformin 500mg"], "frequency": "daily", "time": "08:00"}',
    'system-seed'
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'diagnosis', 'Primary Diagnoses',
    '{"conditions": ["Type 2 Diabetes", "Hypertension"], "icd10": ["E11", "I10"]}',
    'system-seed'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Resident 2: Fatimah Al-Zahrani ────────────────────────────────────────
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

-- Family for Fatimah
INSERT INTO family_members (
  id, resident_id, full_name, relationship, phone, email, is_primary
) VALUES
  (
    'b2000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000002',
    'Mohammed Al-Zahrani', 'son',
    '+966502345678', 'mohammed@example.sa', TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- Linked records for Fatimah
INSERT INTO linked_records (
  id, resident_id, record_type, title, content, recorded_by
) VALUES
  (
    'c2000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000002',
    'care_plan', 'Weekly Care Plan',
    '{"goals": ["Improve mobility", "Monitor blood pressure"], "review_date": "2025-06-01"}',
    'system-seed'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Resident 3: Omar Al-Ghamdi (demo-resident used by AI module) ──────────
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
