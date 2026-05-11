-- ==========================================================================
-- Seed data for all new BE1/BE2 modules
-- Run AFTER seed_all.sql and all new migrations (007–022)
-- ==========================================================================

-- ── Nursing Notes (US-12-01) ──────────────────────────────────────────────

INSERT INTO nursing_notes (id, facility_id, resident_id, author_id, content, category, created_at)
VALUES
  ('nn000001-0000-0000-0000-000000000001', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001', 'nurse-seed',
   'Routine morning check completed. Vitals within normal range. Patient in good spirits.',
   'routine', '2025-05-08T06:00:00Z'),
  ('nn000001-0000-0000-0000-000000000002', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001', 'nurse-seed',
   'Patient reported mild dizziness after lunch. BP slightly elevated (145/90). Will monitor.',
   'concern', '2025-05-08T13:00:00Z'),
  ('nn000001-0000-0000-0000-000000000003', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000002', 'nurse-seed',
   'Evening handoff: Omar had a good day. Medications administered on schedule. No concerns.',
   'handoff', '2025-05-08T19:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ── Shift Handoffs (US-12-03) ─────────────────────────────────────────────

INSERT INTO shift_handoffs (id, facility_id, outgoing_nurse_id, incoming_nurse_id, shift_date, shift_type, summary, residents_covered, pending_tasks)
VALUES
  ('ho000001-0000-0000-0000-000000000001', 'facility-demo',
   'nurse-seed', 'nurse-evening',
   '2025-05-08', 'morning',
   'All residents stable. Ahmad needs BP re-check at 14:00. Omar completed PT session.',
   '["a1b2c3d4-0000-0000-0000-000000000001","a1b2c3d4-0000-0000-0000-000000000002"]',
   '[{"task":"BP re-check Ahmad","due":"14:00"},{"task":"Dinner meds for all","due":"18:00"}]'),
  ('ho000001-0000-0000-0000-000000000002', 'facility-demo',
   'nurse-evening', 'nurse-night',
   '2025-05-08', 'evening',
   'Ahmad BP normalized. All dinner medications administered. Fatimah had a visitor.',
   '["a1b2c3d4-0000-0000-0000-000000000001","a1b2c3d4-0000-0000-0000-000000000003"]',
   '[{"task":"Night meds at 22:00","due":"22:00"}]')
ON CONFLICT (id) DO NOTHING;

-- ── Care Tasks (US-12-05) ─────────────────────────────────────────────────

INSERT INTO care_tasks (id, facility_id, resident_id, title, category, scheduled_time, is_completed, completed_by, completed_at)
VALUES
  ('ct000001-0000-0000-0000-000000000001', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   'Morning hygiene routine', 'personal', '2025-05-08T07:00:00Z',
   TRUE, 'nurse-seed', '2025-05-08T07:15:00Z'),
  ('ct000001-0000-0000-0000-000000000002', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   'Garden walk – 30 minutes', 'recreational', '2025-05-08T10:00:00Z',
   TRUE, 'nurse-seed', '2025-05-08T10:35:00Z'),
  ('ct000001-0000-0000-0000-000000000003', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000002',
   'Room cleaning and linen change', 'hotel', '2025-05-08T09:00:00Z',
   FALSE, NULL, NULL),
  ('ct000001-0000-0000-0000-000000000004', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000002',
   'Afternoon reading session', 'recreational', '2025-05-08T15:00:00Z',
   FALSE, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Inventory (US-12-07) ──────────────────────────────────────────────────

INSERT INTO inventory_items (id, facility_id, name, category, current_stock, min_required, unit)
VALUES
  ('iv000001-0000-0000-0000-000000000001', 'facility-demo',
   'Disposable Gloves (Medium)', 'supplies', 150, 50, 'box'),
  ('iv000001-0000-0000-0000-000000000002', 'facility-demo',
   'Aspirin 100mg', 'medications', 30, 20, 'strip'),
  ('iv000001-0000-0000-0000-000000000003', 'facility-demo',
   'Adult Diapers (Large)', 'personal', 10, 25, 'pack'),
  ('iv000001-0000-0000-0000-000000000004', 'facility-demo',
   'Hand Sanitizer 500ml', 'supplies', 8, 10, 'bottle')
ON CONFLICT (id) DO NOTHING;

-- ── Notifications (US-15-07) ──────────────────────────────────────────────

INSERT INTO notifications (id, facility_id, user_id, message, type, read, created_at)
VALUES
  ('nt000001-0000-0000-0000-000000000001', 'facility-demo', 'nurse-seed',
   'Medication reminder: Aspirin 100mg for Ahmad Al-Rashid at 08:00',
   'medication_reminder', FALSE, '2025-05-08T05:00:00Z'),
  ('nt000001-0000-0000-0000-000000000002', 'facility-demo', 'nurse-seed',
   'Vital alert: Ahmad Al-Rashid – heart rate 110 bpm (threshold 60-100)',
   'vital_alert', FALSE, '2025-05-08T11:00:00Z'),
  ('nt000001-0000-0000-0000-000000000003', 'facility-demo', 'admin-seed',
   'New complaint: Physical therapy schedule concern (high priority)',
   'complaint', FALSE, '2025-05-07T08:00:00Z'),
  ('nt000001-0000-0000-0000-000000000004', 'facility-demo', 'family-khalid',
   'Visit approved: Khalid Al-Rashid on 2025-05-12 at 10:00',
   'visit_reminder', TRUE, '2025-05-10T08:00:00Z'),
  ('nt000001-0000-0000-0000-000000000005', 'facility-demo', 'admin-seed',
   'Weekly AI summary generated for Omar Al-Ghamdi',
   'ai_summary', FALSE, '2025-05-08T06:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ── Resident Medical Info (US-15-08) ──────────────────────────────────────

INSERT INTO resident_medical_info (id, resident_id, facility_id, diagnoses, allergies, blood_type, chronic_conditions)
VALUES
  ('rm000001-0000-0000-0000-000000000001',
   'a1b2c3d4-0000-0000-0000-000000000001', 'facility-demo',
   '["Type 2 Diabetes","Hypertension"]',
   '["Penicillin"]',
   'A+',
   '["Diabetes","Hypertension"]'),
  ('rm000001-0000-0000-0000-000000000002',
   'a1b2c3d4-0000-0000-0000-000000000002', 'facility-demo',
   '["Osteoarthritis"]',
   '[]',
   'O+',
   '["Osteoarthritis"]')
ON CONFLICT (resident_id) DO NOTHING;

-- ── Doctor Visits (US-13-01) ──────────────────────────────────────────────

INSERT INTO doctor_visits (id, facility_id, resident_id, doctor_name, specialty, visit_date, purpose, results, created_by)
VALUES
  ('dv000001-0000-0000-0000-000000000001', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   'Dr. Sami Al-Harbi', 'Cardiology', '2025-05-15',
   'Routine cardiac checkup', NULL, 'nurse-seed'),
  ('dv000001-0000-0000-0000-000000000002', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000002',
   'Dr. Layla Al-Qahtani', 'Endocrinology', '2025-05-12',
   'Blood sugar follow-up', 'HbA1c at 6.8%, improving', 'nurse-seed')
ON CONFLICT (id) DO NOTHING;

-- ── Medical Sessions (US-13-03) ───────────────────────────────────────────

INSERT INTO medical_sessions (id, facility_id, resident_id, type, specialist_name, session_date, session_time, notes)
VALUES
  ('ms000001-0000-0000-0000-000000000001', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   'doctor', 'Dr. Sami Al-Harbi', '2025-05-10', '10:00',
   'Regular follow-up. Patient stable.'),
  ('ms000001-0000-0000-0000-000000000002', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000002',
   'pt', 'Therapist Nora', '2025-05-09', '14:00',
   'PT session completed. Range of motion improving.'),
  ('ms000001-0000-0000-0000-000000000003', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   'vitals', NULL, '2025-05-08', '08:00',
   'Morning vitals recorded. All within normal range.')
ON CONFLICT (id) DO NOTHING;

-- ── Prescriptions (US-13-05) ──────────────────────────────────────────────

INSERT INTO medical_prescriptions (id, facility_id, resident_id, title, doctor_name, prescription_date)
VALUES
  ('rx000001-0000-0000-0000-000000000001', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   'Metformin 500mg - Twice Daily', 'Dr. Layla Al-Qahtani', '2025-04-01'),
  ('rx000001-0000-0000-0000-000000000002', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   'Aspirin 100mg - Daily', 'Dr. Sami Al-Harbi', '2025-03-15')
ON CONFLICT (id) DO NOTHING;

-- ── Meal Plans (US-13-07) ─────────────────────────────────────────────────

INSERT INTO meal_plans (id, facility_id, resident_id, plan_date, breakfast, lunch, dinner, special_instructions, created_by)
VALUES
  ('mp000001-0000-0000-0000-000000000001', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   '2025-05-12',
   'Oatmeal with honey, fresh fruit, green tea',
   'Grilled chicken breast, brown rice, vegetable soup',
   'Light salad, yogurt, whole wheat bread',
   'Low sodium diet. Diabetic-friendly. No added sugar.',
   'nurse-seed'),
  ('mp000001-0000-0000-0000-000000000002', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000002',
   '2025-05-12',
   'Scrambled eggs, toast, orange juice',
   'Fish fillet, mashed potatoes, steamed vegetables',
   'Lentil soup, bread, fruit',
   NULL, 'nurse-seed')
ON CONFLICT (id) DO NOTHING;

-- ── Activity Sessions (US-14-01) ──────────────────────────────────────────

INSERT INTO activity_sessions (id, facility_id, title, description, start_time, location, participants, created_by)
VALUES
  ('ac000001-0000-0000-0000-000000000001', 'facility-demo',
   'Morning Yoga & Stretching',
   'Gentle yoga and stretching exercises for seniors',
   '2025-05-12T09:00:00Z', 'Garden Area',
   '["a1b2c3d4-0000-0000-0000-000000000001","a1b2c3d4-0000-0000-0000-000000000002"]',
   'nurse-seed'),
  ('ac000001-0000-0000-0000-000000000002', 'facility-demo',
   'Art Therapy Workshop',
   'Painting and creative arts session',
   '2025-05-12T14:00:00Z', 'Activity Room',
   '["a1b2c3d4-0000-0000-0000-000000000002"]',
   'admin-seed')
ON CONFLICT (id) DO NOTHING;

-- ── Volunteer Profiles (US-14-03) ─────────────────────────────────────────

INSERT INTO volunteer_profiles (id, user_id, facility_id, name, bio, location, skills, hours_logged)
VALUES
  ('vp000001-0000-0000-0000-000000000001', 'vol-seed', 'facility-demo',
   'Ahmad Al-Volunteer', 'Passionate about elderly care and community service.',
   'Riyadh, KSA', '["First Aid","Music Therapy","Arabic Calligraphy"]', 24)
ON CONFLICT (user_id) DO NOTHING;

-- ── Volunteer Opportunities (US-14-03) ────────────────────────────────────

INSERT INTO volunteer_opportunities (id, facility_id, title, org, hours, points, tags, description, total_slots, filled_slots, date_info)
VALUES
  ('vo000001-0000-0000-0000-000000000001', 'facility-demo',
   'Garden Maintenance Day', 'Raaya Care', 3, 30,
   '["outdoor","gardening"]',
   'Help maintain the facility garden and plant new flowers.',
   5, 1, 'Every Saturday 9:00-12:00'),
  ('vo000001-0000-0000-0000-000000000002', 'facility-demo',
   'Reading Buddy Program', 'Raaya Care', 2, 20,
   '["indoor","reading","companionship"]',
   'Read books and newspapers to residents.',
   3, 0, 'Weekdays 14:00-16:00'),
  ('vo000001-0000-0000-0000-000000000003', 'facility-demo',
   'Music Therapy Assistant', 'Raaya Care', 2, 25,
   '["indoor","music","therapy"]',
   'Assist the music therapist during group sessions.',
   2, 1, 'Tuesdays & Thursdays 10:00-12:00')
ON CONFLICT (id) DO NOTHING;

-- ── Volunteer Bookings (US-14-03) ─────────────────────────────────────────

INSERT INTO volunteer_bookings (id, facility_id, volunteer_id, opportunity_id, status)
VALUES
  ('vb000001-0000-0000-0000-000000000001', 'facility-demo',
   'vp000001-0000-0000-0000-000000000001',
   'vo000001-0000-0000-0000-000000000001',
   'confirmed')
ON CONFLICT (id) DO NOTHING;

-- ── Volunteer Certificates (US-14-04) ─────────────────────────────────────

INSERT INTO volunteer_certificates (id, volunteer_id, name, award_date, description, is_locked, progress)
VALUES
  ('vc000001-0000-0000-0000-000000000001',
   'vp000001-0000-0000-0000-000000000001',
   'First Aid Certified', '2025-03-01',
   'Completed Red Crescent first aid training', FALSE, 100),
  ('vc000001-0000-0000-0000-000000000002',
   'vp000001-0000-0000-0000-000000000001',
   'Community Champion', NULL,
   'Log 50 volunteer hours', TRUE, 48)
ON CONFLICT (id) DO NOTHING;

-- ── Volunteer Ratings (US-14-04) ──────────────────────────────────────────

INSERT INTO volunteer_ratings (id, volunteer_id, from_name, category, score, comment, date, chips, criteria_scores)
VALUES
  ('vr000001-0000-0000-0000-000000000001',
   'vp000001-0000-0000-0000-000000000001',
   'Nurse Sarah', 'Garden Session', 4.5,
   'Very helpful and energetic during the garden cleanup.',
   '2025-05-05',
   '["punctual","friendly","hardworking"]',
   '{"communication":4.5,"reliability":5.0,"attitude":4.0}')
ON CONFLICT (id) DO NOTHING;

-- ── Memory Moments (US-14-06) ─────────────────────────────────────────────

INSERT INTO memory_moments (id, facility_id, resident_id, image_url, activity_title, appreciations, uploaded_by)
VALUES
  ('mm000001-0000-0000-0000-000000000001', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   'https://raaya-media.s3.amazonaws.com/memories/garden-walk-ahmad.jpg',
   'Garden Walk with Ahmad', 5, 'nurse-seed'),
  ('mm000001-0000-0000-0000-000000000002', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000002',
   'https://raaya-media.s3.amazonaws.com/memories/art-session-omar.jpg',
   'Art Therapy Session', 3, 'admin-seed')
ON CONFLICT (id) DO NOTHING;

-- ── Voice Messages (US-15-01) ─────────────────────────────────────────────

INSERT INTO voice_messages (id, facility_id, resident_id, sender_type, title, audio_url, duration_seconds)
VALUES
  ('vm000001-0000-0000-0000-000000000001', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   'family', 'Good morning from Khalid',
   'https://raaya-media.s3.amazonaws.com/voice/khalid-morning.mp3', 45),
  ('vm000001-0000-0000-0000-000000000002', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000002',
   'staff', 'Therapy instructions from Nora',
   'https://raaya-media.s3.amazonaws.com/voice/nora-therapy.mp3', 120)
ON CONFLICT (id) DO NOTHING;

-- ── Family Bills (US-15-03) ───────────────────────────────────────────────

INSERT INTO family_bills (id, facility_id, resident_id, title, month, amount, is_paid, due_date)
VALUES
  ('bl000001-0000-0000-0000-000000000001', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   'Monthly Care Fee – May 2025', '2025-05', 5000.00, FALSE, '2025-06-01'),
  ('bl000001-0000-0000-0000-000000000002', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000001',
   'Monthly Care Fee – April 2025', '2025-04', 5000.00, TRUE, '2025-05-01'),
  ('bl000001-0000-0000-0000-000000000003', 'facility-demo',
   'a1b2c3d4-0000-0000-0000-000000000002',
   'Monthly Care Fee – May 2025', '2025-05', 4500.00, FALSE, '2025-06-01')
ON CONFLICT (id) DO NOTHING;
