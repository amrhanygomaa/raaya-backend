INSERT INTO managed_users (
  id, cognito_sub, facility_id, email, full_name,
  role, status, created_by
) VALUES
  (
    'ad000000-0000-0000-0000-000000000001',
    'admin-seed',
    'facility-demo',
    'admin@raaya.demo',
    'Demo Admin',
    'Admin',
    'active',
    'seed'
  ),
  (
    'ad000000-0000-0000-0000-000000000002',
    'nurse-seed',
    'facility-demo',
    'nurse@raaya.demo',
    'Demo Nurse',
    'Nurse',
    'active',
    'seed'
  ),
  (
    'ad000000-0000-0000-0000-000000000003',
    'disabled-user-seed',
    'facility-demo',
    'disabled@raaya.demo',
    'Disabled Demo User',
    'ClinicalStaff',
    'disabled',
    'seed'
  )
ON CONFLICT (facility_id, email) DO NOTHING;

INSERT INTO facility_settings (
  id,
  facility_id,
  medication_reminder_minutes_before,
  visit_reminder_hours_before,
  alert_push_enabled,
  timezone,
  vital_thresholds,
  updated_by
) VALUES (
  'fs000000-0000-0000-0000-000000000001',
  'facility-demo',
  30,
  24,
  TRUE,
  'Asia/Riyadh',
  '{
    "heart_rate": { "minValue": 60, "maxValue": 100, "unit": "bpm" },
    "blood_pressure_systolic": { "minValue": 90, "maxValue": 140, "unit": "mmHg" },
    "oxygen_saturation": { "minValue": 95, "unit": "%" }
  }'::jsonb,
  'seed'
)
ON CONFLICT (facility_id) DO NOTHING;
