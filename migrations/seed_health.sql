-- US-06-01: Seed – default thresholds, sample vitals, and alerts
-- Run after 004_create_health.sql.

-- ── Default Thresholds (facility-demo) ──────────────────────────────────

INSERT INTO vital_thresholds (id, facility_id, vital_type, min_value, max_value, unit) VALUES
  ('th000000-0000-0000-0000-000000000001', 'facility-demo', 'heart_rate',                60,  100, 'bpm'),
  ('th000000-0000-0000-0000-000000000002', 'facility-demo', 'blood_pressure_systolic',    90,  140, 'mmHg'),
  ('th000000-0000-0000-0000-000000000003', 'facility-demo', 'blood_pressure_diastolic',   60,   90, 'mmHg'),
  ('th000000-0000-0000-0000-000000000004', 'facility-demo', 'temperature',              36.0, 37.5, '°C'),
  ('th000000-0000-0000-0000-000000000005', 'facility-demo', 'respiratory_rate',           12,   20, 'breaths/min'),
  ('th000000-0000-0000-0000-000000000006', 'facility-demo', 'oxygen_saturation',          95, NULL, '%'),
  ('th000000-0000-0000-0000-000000000007', 'facility-demo', 'blood_glucose',              70,  140, 'mg/dL')
ON CONFLICT (facility_id, vital_type) DO NOTHING;

-- ── Sample Vital Signs ──────────────────────────────────────────────────

-- Ahmad – normal reading
INSERT INTO vital_signs (
  id, resident_id, facility_id, recorded_by, recorded_at,
  heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
  temperature, respiratory_rate, oxygen_saturation, blood_glucose, notes
) VALUES (
  'vs000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo', 'nurse-seed', '2025-05-08 08:00:00+03',
  72, 120, 80,
  36.8, 16, 98, 95,
  'Morning check – all normal'
) ON CONFLICT (id) DO NOTHING;

-- Ahmad – abnormal reading (high heart rate + low O2)
INSERT INTO vital_signs (
  id, resident_id, facility_id, recorded_by, recorded_at,
  heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
  temperature, respiratory_rate, oxygen_saturation, notes
) VALUES (
  'vs000000-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'facility-demo', 'nurse-seed', '2025-05-08 14:00:00+03',
  110, 135, 85,
  37.1, 18, 92,
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
  68, 125, 78,
  36.6, 14, 97
) ON CONFLICT (id) DO NOTHING;

-- ── Sample Alerts (from Ahmad's abnormal reading) ───────────────────────

INSERT INTO vital_alerts (
  id, vital_sign_id, resident_id, facility_id,
  vital_type, recorded_value, threshold_min, threshold_max,
  severity, status
) VALUES
  (
    'va000000-0000-0000-0000-000000000001',
    'vs000000-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'facility-demo',
    'heart_rate', 110, 60, 100,
    'warning', 'active'
  ),
  (
    'va000000-0000-0000-0000-000000000002',
    'vs000000-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'facility-demo',
    'oxygen_saturation', 92, 95, NULL,
    'warning', 'active'
  )
ON CONFLICT (id) DO NOTHING;
