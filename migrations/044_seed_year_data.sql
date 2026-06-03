-- ════════════════════════════════════════════════════════════════════════════
-- 044_seed_year_data.sql  —  بيانات سنة كاملة (2025-06-01 → 2026-06-01)
-- يشمل كل الأدوار: ممرض · مدير · متطوع · أخصائي اجتماعي
-- آمن للإعادة: DO-block count guards + ON CONFLICT DO NOTHING
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- §0  RESIDENTS — upsert with full-year admission dates
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO residents (id, facility_id, first_name, last_name, date_of_birth,
  gender, national_id, room_number, admission_date, status, notes)
VALUES
  ('67697bba-1851-426b-9770-d8bc7dc8c705','facility-demo',
   'أحمد','الراشد','1940-03-15','male','1234567891','101','2025-06-01','active',
   'داء السكري النوع الثاني وارتفاع ضغط الدم'),
  ('09d40b36-81e8-46ce-894b-d330bc9369f4','facility-demo',
   'فاطمة','الزهراني','1935-07-20','female','0987654322','205','2025-06-15','active',
   'قصور قلب احتقاني معوّض وتراجع معرفي خفيف'),
  ('622e6c8c-5c2b-4423-9216-016378102111','facility-demo',
   'عمر','الغامدي','1942-11-05','male','1122334455','312','2025-07-01','active',
   'تعافٍ من سكتة دماغية إقفارية مع ضعف الجانب الأيمن')
ON CONFLICT (id) DO UPDATE SET
  admission_date = EXCLUDED.admission_date,
  notes          = EXCLUDED.notes;

-- ════════════════════════════════════════════════════════════════════════════
-- §1  MEDICAL INFO
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO resident_medical_info (id, resident_id, facility_id,
  diagnoses, allergies, blood_type, chronic_conditions)
VALUES
  ('rmi10001-0000-0000-0000-000000000001',
   '67697bba-1851-426b-9770-d8bc7dc8c705','facility-demo',
   '["داء السكري من النوع الثاني","ارتفاع ضغط الدم","اعتلال الشبكية السكري المبكر"]',
   '["البنسلين","السلفوناميدات"]','A+',
   '["داء السكري","ارتفاع ضغط الدم"]'),
  ('rmi20001-0000-0000-0000-000000000001',
   '09d40b36-81e8-46ce-894b-d330bc9369f4','facility-demo',
   '["قصور القلب الاحتقاني المعوّض","تراجع معرفي خفيف","رجفان أذيني متقطع"]',
   '["أدوية NSAIDs"]','O+',
   '["قصور القلب","الرجفان الأذيني","التراجع المعرفي"]'),
  ('rmi30001-0000-0000-0000-000000000001',
   '622e6c8c-5c2b-4423-9216-016378102111','facility-demo',
   '["سكتة دماغية إقفارية (تعافٍ)","ضعف في الجانب الأيمن","عسر بلع خفيف","ارتفاع ضغط الدم"]',
   '["الوارفارين (حساسية جلدية)"]','B+',
   '["ما بعد السكتة الدماغية","ارتفاع ضغط الدم"]')
ON CONFLICT (resident_id) DO UPDATE SET
  diagnoses         = EXCLUDED.diagnoses,
  allergies         = EXCLUDED.allergies,
  chronic_conditions= EXCLUDED.chronic_conditions;

-- ════════════════════════════════════════════════════════════════════════════
-- §2  MANAGED USERS — specialist · volunteer · family accounts
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO managed_users (id, cognito_sub, facility_id, email, full_name, role, status, created_by)
VALUES
  ('ad000000-0000-0000-0000-000000000004','specialist-seed','facility-demo',
   'specialist1@raaya.demo','د. نورة الشهراني','SocialSpecialist','active','seed'),
  ('ad000000-0000-0000-0000-000000000005','specialist2-seed','facility-demo',
   'specialist2@wanas.demo','د. خالد ناصر','ClinicalStaff','active','seed'),
  ('ad000000-0000-0000-0000-000000000006','volunteer-seed','facility-demo',
   'volunteer@wanas.demo','إبراهيم المطيري','Volunteer','active','seed'),
  ('ad000000-0000-0000-0000-000000000007','family-ahmad-seed','facility-demo',
   'family.ahmad@wanas.demo','خالد الراشد','Family','active','seed'),
  ('ad000000-0000-0000-0000-000000000008','family-fatimah-seed','facility-demo',
   'family.fatimah@wanas.demo','محمد الزهراني','Family','active','seed'),
  ('ad000000-0000-0000-0000-000000000009','family-omar-seed','facility-demo',
   'family.omar@wanas.demo','سارة الغامدي','Family','active','seed')
ON CONFLICT (facility_id, email) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- §3  FAMILY MEMBERS
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO family_members (id, resident_id, full_name, relationship, phone, email, is_primary)
VALUES
  ('fma10001-0000-0000-0000-000000000001',
   '67697bba-1851-426b-9770-d8bc7dc8c705',
   'خالد الراشد','ابن','+966501234567','family.ahmad@wanas.demo',TRUE),
  ('fmf10001-0000-0000-0000-000000000001',
   '09d40b36-81e8-46ce-894b-d330bc9369f4',
   'محمد الزهراني','ابن','+966502345678','family.fatimah@wanas.demo',TRUE),
  ('fmo10001-0000-0000-0000-000000000001',
   '622e6c8c-5c2b-4423-9216-016378102111',
   'سارة الغامدي','ابنة','+966503456789','family.omar@wanas.demo',TRUE)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- §4  MEDICATIONS  (3 per resident)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO medication_schedules (id, resident_id, facility_id,
  medication_name, dosage, route, frequency, scheduled_times,
  start_date, is_active, prescriber, notes)
VALUES
  -- Ahmad
  ('msaa0001-0000-0000-0000-000000000001','67697bba-1851-426b-9770-d8bc7dc8c705','facility-demo',
   'ميتفورمين 500 مجم','1 قرص','oral','bid','{08:00,20:00}','2025-06-01',TRUE,
   'Dr. Sami Al-Harbi','مع الوجبة لتجنب الغثيان'),
  ('msaa0002-0000-0000-0000-000000000001','67697bba-1851-426b-9770-d8bc7dc8c705','facility-demo',
   'أملوديبين 5 مجم','1 قرص','oral','daily','{08:00}','2025-06-01',TRUE,
   'Dr. Sami Al-Harbi','مراقبة ضغط الدم أسبوعياً'),
  ('msaa0003-0000-0000-0000-000000000001','67697bba-1851-426b-9770-d8bc7dc8c705','facility-demo',
   'أسبرين 100 مجم','1 قرص','oral','daily','{08:00}','2025-06-01',TRUE,
   'Dr. Sami Al-Harbi','بعد الإفطار — مضاد للتجلط'),
  -- Fatimah
  ('msff0001-0000-0000-0000-000000000001','09d40b36-81e8-46ce-894b-d330bc9369f4','facility-demo',
   'فيوروسيميد 40 مجم','1 قرص','oral','daily','{07:00}','2025-06-15',TRUE,
   'Dr. Layla Mansouri','مراقبة البوتاسيوم أسبوعياً'),
  ('msff0002-0000-0000-0000-000000000001','09d40b36-81e8-46ce-894b-d330bc9369f4','facility-demo',
   'ليزينوبريل 10 مجم','1 قرص','oral','daily','{08:00}','2025-06-15',TRUE,
   'Dr. Layla Mansouri','مراقبة وظائف الكلى شهرياً'),
  ('msff0003-0000-0000-0000-000000000001','09d40b36-81e8-46ce-894b-d330bc9369f4','facility-demo',
   'ريفاستيجمين لصقة 4.6 مجم','1 لصقة','transdermal','daily','{09:00}','2025-06-15',TRUE,
   'Dr. Khalid Nasser','تغيير موقع اللصقة يومياً'),
  -- Omar
  ('msoo0001-0000-0000-0000-000000000001','622e6c8c-5c2b-4423-9216-016378102111','facility-demo',
   'كلوبيدوجريل 75 مجم','1 قرص','oral','daily','{08:00}','2025-07-01',TRUE,
   'Dr. Ibrahim Al-Otaibi','وقاية من تجلط الدم بعد السكتة'),
  ('msoo0002-0000-0000-0000-000000000001','622e6c8c-5c2b-4423-9216-016378102111','facility-demo',
   'أتورفاستاتين 40 مجم','1 قرص','oral','daily','{22:00}','2025-07-01',TRUE,
   'Dr. Ibrahim Al-Otaibi','في الليل للفاعلية المثلى'),
  ('msoo0003-0000-0000-0000-000000000001','622e6c8c-5c2b-4423-9216-016378102111','facility-demo',
   'فيتامين D3 1000 وحدة','1 كبسولة','oral','daily','{12:00}','2025-07-01',TRUE,
   'Dr. Ibrahim Al-Otaibi','دعم صحة العظام مع وجبة الغداء')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- §5  VITAL SIGNS — سنة كاملة مرتين في الأسبوع لكل مقيم
-- ════════════════════════════════════════════════════════════════════════════

-- ── Ahmad (diabetic + hypertensive) ─────────────────────────────────────────
DO $va$ BEGIN
  IF (SELECT COUNT(*) FROM vital_signs
      WHERE resident_id='67697bba-1851-426b-9770-d8bc7dc8c705'
        AND recorded_at >= '2025-06-01') < 50 THEN

    INSERT INTO vital_signs (id, resident_id, facility_id, recorded_by, recorded_at,
      heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
      temperature, respiratory_rate, oxygen_saturation, blood_glucose, notes)
    SELECT
      gen_random_uuid(),
      '67697bba-1851-426b-9770-d8bc7dc8c705','facility-demo','nurse-seed',
      TIMESTAMPTZ '2025-06-03 08:00:00+03' + (idx * INTERVAL '3 days 12 hours'),
      -- HR 70-88, spikes at idx 10,30,54,78,96
      70 + (idx % 14) + CASE WHEN idx IN (10,30,54,78,96) THEN 18 ELSE 0 END,
      -- SBP 118-142, hypertensive spikes
      118 + (idx % 22) + CASE WHEN idx IN (6,22,44,68,90) THEN 18 ELSE 0 END,
      -- DBP 76-92
      76 + (idx % 16),
      -- Temp 36.4-37.1
      ROUND((36.4 + (idx % 8) * 0.09)::numeric, 1),
      -- RR 14-18
      14 + (idx % 5),
      -- SpO2 96-99
      96 + (idx % 4),
      -- Glucose 92-178 (diabetic)
      92 + (idx % 56) + CASE WHEN idx IN (16,38,62,84,102) THEN 50 ELSE 0 END,
      CASE
        WHEN idx IN (6,22,44,68,90)    THEN 'ضغط الدم مرتفع — تم التبليغ للطبيب ومتابعته'
        WHEN idx IN (16,38,62,84,102)  THEN 'سكر الدم مرتفع — تم تعديل الجرعة وتقليل النشويات'
        WHEN idx IN (10,30,54,78,96)   THEN 'تسارع ضربات القلب — مراقبة مستمرة'
        WHEN idx % 2 = 0               THEN 'قياسات صباحية — ضمن المعدل الطبيعي'
        ELSE                                'قياسات مسائية — ضمن المعدل الطبيعي'
      END
    FROM generate_series(0, 103) AS idx;

  END IF;
END $va$;

-- ── Fatimah (heart failure + AFib) ──────────────────────────────────────────
DO $vf$ BEGIN
  IF (SELECT COUNT(*) FROM vital_signs
      WHERE resident_id='09d40b36-81e8-46ce-894b-d330bc9369f4'
        AND recorded_at >= '2025-06-01') < 50 THEN

    INSERT INTO vital_signs (id, resident_id, facility_id, recorded_by, recorded_at,
      heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
      temperature, respiratory_rate, oxygen_saturation, notes)
    SELECT
      gen_random_uuid(),
      '09d40b36-81e8-46ce-894b-d330bc9369f4','facility-demo','nurse-seed',
      TIMESTAMPTZ '2025-06-17 08:00:00+03' + (idx * INTERVAL '3 days 12 hours'),
      -- HR 74-96, AFib spikes (more variable)
      74 + (idx % 18) + CASE WHEN idx IN (8,25,48,72,90) THEN 20 ELSE 0 END,
      -- SBP 112-134 (heart failure = lower)
      112 + (idx % 20) + CASE WHEN idx IN (15,35,60,80) THEN 12 ELSE 0 END,
      -- DBP 68-84
      68 + (idx % 16),
      -- Temp
      ROUND((36.3 + (idx % 9) * 0.08)::numeric, 1),
      -- RR 14-20 (heart failure = slightly higher)
      14 + (idx % 7),
      -- SpO2 93-97 (heart failure = lower)
      93 + (idx % 5),
      CASE
        WHEN idx IN (8,25,48,72,90)   THEN 'تسارع القلب بسبب الرجفان الأذيني — تم إخطار الطبيب'
        WHEN idx IN (15,35,60,80)     THEN 'ارتفاع طفيف في الضغط — مراقبة'
        WHEN (93 + (idx % 5)) < 95    THEN 'انخفاض تشبع الأكسجين — تم إعطاء أكسجين تكميلي'
        WHEN idx % 2 = 0              THEN 'قياسات صباحية — مستقرة'
        ELSE                               'قياسات مسائية — مستقرة'
      END
    FROM generate_series(0, 99) AS idx;

  END IF;
END $vf$;

-- ── Omar (post-stroke, BP improving over time) ───────────────────────────────
DO $vo$ BEGIN
  IF (SELECT COUNT(*) FROM vital_signs
      WHERE resident_id='622e6c8c-5c2b-4423-9216-016378102111'
        AND recorded_at >= '2025-07-01') < 50 THEN

    INSERT INTO vital_signs (id, resident_id, facility_id, recorded_by, recorded_at,
      heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
      temperature, respiratory_rate, oxygen_saturation, notes)
    SELECT
      gen_random_uuid(),
      '622e6c8c-5c2b-4423-9216-016378102111','facility-demo','nurse-seed',
      TIMESTAMPTZ '2025-07-01 08:00:00+03' + (idx * INTERVAL '3 days 12 hours'),
      -- HR 66-82
      66 + (idx % 16),
      -- SBP: starts high (140-165) post-stroke → improves by idx 28 → stable 122-138
      CASE
        WHEN idx < 28 THEN 145 + (idx % 18) + CASE WHEN idx IN (5,14,22) THEN 10 ELSE 0 END
        WHEN idx < 56 THEN 132 + (idx % 14)
        ELSE               122 + (idx % 16)
      END,
      -- DBP: starts 88-98, improves to 78-88
      CASE
        WHEN idx < 28 THEN 90 + (idx % 10)
        WHEN idx < 56 THEN 84 + (idx % 8)
        ELSE               78 + (idx % 10)
      END,
      -- Temp
      ROUND((36.5 + (idx % 7) * 0.08)::numeric, 1),
      -- RR 14-17
      14 + (idx % 4),
      -- SpO2 97-99
      97 + (idx % 3),
      CASE
        WHEN idx < 28 AND (145 + (idx % 18)) > 155 THEN 'ضغط دم مرتفع جداً — تدخل طبي فوري'
        WHEN idx < 56 AND idx % 8 = 0              THEN 'ضغط الدم في تحسن تدريجي — استمرار العلاج'
        WHEN idx >= 56                              THEN 'ضغط الدم مستقر — تحسن ممتاز'
        WHEN idx % 2 = 0                           THEN 'قياسات صباحية — ضمن الهدف العلاجي'
        ELSE                                            'قياسات مسائية — مستقرة'
      END
    FROM generate_series(0, 95) AS idx;

  END IF;
END $vo$;

-- ════════════════════════════════════════════════════════════════════════════
-- §6  NURSING NOTES — أسبوعياً لكل مقيم (52 ملاحظة/مقيم)
-- ════════════════════════════════════════════════════════════════════════════

DO $na$ BEGIN
  IF (SELECT COUNT(*) FROM nursing_notes
      WHERE resident_id='67697bba-1851-426b-9770-d8bc7dc8c705'
        AND created_at >= '2025-06-01') < 30 THEN

    INSERT INTO nursing_notes (id, facility_id, resident_id, author_id, content, category, created_at)
    SELECT
      gen_random_uuid(),
      'facility-demo','67697bba-1851-426b-9770-d8bc7dc8c705','nurse-seed',
      CASE (idx % 10)
        WHEN 0 THEN 'فحص صباحي روتيني لأحمد. الإشارات الحيوية ضمن المعدل. المريض في حالة مزاجية جيدة وشهيته طيبة. أخذ أدويته الصباحية دون مشاكل.'
        WHEN 1 THEN 'أبلغ أحمد عن ألم خفيف في الركبة اليسرى. تم تطبيق كمادات دافئة. الألم خف بعد ساعة. سيُتابَع مع الفيزيائي غداً.'
        WHEN 2 THEN 'زار خالد (نجل أحمد) اليوم لمدة ساعتين. بدا المريض سعيداً جداً بالزيارة. تناولوا القهوة معاً في الحديقة. مزاج رائع بعد الزيارة.'
        WHEN 3 THEN 'قياس سكر ما بعد الغداء: 145 مجم/ديسيلتر. تم تعديل وجبة العشاء لتكون خفيفة على النشويات. سيُراجَع الطبيب إذا ارتفع أكثر.'
        WHEN 4 THEN 'جلسة المشي اليومية في الحديقة مدة 20 دقيقة. أحمد متحمس للمشي ويسأل عن زيادة المدة. تمت استشارة الفيزيائي وأذن بزيادة 5 دقائق أسبوعياً.'
        WHEN 5 THEN 'تسليم وردية المساء: أحمد استقر طوال اليوم. ضغط الدم 128/82. سكر قبل العشاء 112. لا أحداث طارئة. الأدوية المسائية أُعطيت بوقتها.'
        WHEN 6 THEN 'شكوى من صعوبة في النوم الليلة الماضية. أفاد المريض بأن التفكير في العائلة يبقيه مستيقظاً. تمت إحالته للأخصائية الاجتماعية لجلسة دعم نفسي.'
        WHEN 7 THEN 'حضر أحمد جلسة الذكريات اليوم وشارك بحماس في سرد قصص من شبابه. مزاجه كان ممتازاً. طلب مشاركة صور من تلك الفترة مع عائلته.'
        WHEN 8 THEN 'ارتفاع مؤقت في ضغط الدم إلى 148/94. تم إعطاء الجرعة المعتادة من الأملوديبين. أُعيد القياس بعد ساعة: 132/86. سيُخطَر الطبيب المعالج.'
        ELSE         'متابعة روتينية. جميع القياسات طبيعية. المريض تناول وجباته الثلاث بانتظام. لا شكاوى أو أعراض جديدة.'
      END,
      CASE (idx % 4) WHEN 0 THEN 'routine' WHEN 1 THEN 'concern' WHEN 2 THEN 'handoff' ELSE 'routine' END,
      TIMESTAMPTZ '2025-06-05 07:00:00+03' + (idx * INTERVAL '7 days')
    FROM generate_series(0, 51) AS idx;

  END IF;
END $na$;

DO $nf$ BEGIN
  IF (SELECT COUNT(*) FROM nursing_notes
      WHERE resident_id='09d40b36-81e8-46ce-894b-d330bc9369f4'
        AND created_at >= '2025-06-01') < 30 THEN

    INSERT INTO nursing_notes (id, facility_id, resident_id, author_id, content, category, created_at)
    SELECT
      gen_random_uuid(),
      'facility-demo','09d40b36-81e8-46ce-894b-d330bc9369f4','nurse-seed',
      CASE (idx % 10)
        WHEN 0 THEN 'فحص صباحي لفاطمة. نبضها 82 في الدقيقة. تشبع الأكسجين 95%. تناولت فيوروسيميد الصباحي. لا وذمة في الكاحلين اليوم — تحسن ملحوظ.'
        WHEN 1 THEN 'فاطمة في حالة ارتباك خفيف هذا الصباح. لم تتذكر اسم الممرضة المداومة. تم إجراء اختبار MMSE مختصر. النتيجة 22/30. لا تغيير حاد عن السابق.'
        WHEN 2 THEN 'تسارع القلب إلى 102 نبضة/دقيقة. المريضة أُعطيت وضعية الاسترخاء وتم قياس النبض كل 15 دقيقة. استقر على 88 بعد نصف ساعة. تم إخطار الطبيب.'
        WHEN 3 THEN 'محمد (نجل فاطمة) زارها اليوم وأحضر معه صوراً قديمة من التراث العائلي. ردة فعل فاطمة كانت رائعة — تذكرت تفاصيل دقيقة من الماضي. مزاجها أضاء.'
        WHEN 4 THEN 'تم تغيير لصقة ريفاستيجمين اليوم. الموضع الجديد في الكتف الأيسر. لا احمرار أو تهيج في الموضع القديم على الكتف الأيمن. تم التوثيق.'
        WHEN 5 THEN 'فاطمة رفضت تناول العشاء اليوم مبدئياً. بعد حديث هادئ معها قبلت الأكل. تناولت نصف الوجبة. لا علامات بلع مضطربة. الشهية متذبذبة هذا الأسبوع.'
        WHEN 6 THEN 'جلسة العلاج التذكاري اليوم. فاطمة شاركت بحيوية وتذكرت أغاني من زمن الطفولة. الأخصائية أشارت إلى تحسن ملحوظ في التفاعل الاجتماعي.'
        WHEN 7 THEN 'وذمة خفيفة في الكاحل الأيمن. تم رفع القدم بوسادة. مراجعة جرعة الفيوروسيميد مع الطبيب — قد يحتاج لتعديل. تم توثيق القياسات.'
        WHEN 8 THEN 'يوم هادئ. فاطمة جلست في الحديقة لمدة 30 دقيقة مع أنس جو النسيم. بدت مرتاحة وطالبت بالعودة مرة أخرى غداً. هذه الجلسات تحسّن مزاجها كثيراً.'
        ELSE         'تسليم وردية مسائية: فاطمة مستقرة. نبض 80، ضغط 122/76، تشبع 96%. الأدوية أُعطيت. لا أحداث طارئة خلال الوردية.'
      END,
      CASE (idx % 4) WHEN 0 THEN 'routine' WHEN 1 THEN 'concern' WHEN 2 THEN 'handoff' ELSE 'routine' END,
      TIMESTAMPTZ '2025-06-19 07:00:00+03' + (idx * INTERVAL '7 days')
    FROM generate_series(0, 49) AS idx;

  END IF;
END $nf$;

DO $no$ BEGIN
  IF (SELECT COUNT(*) FROM nursing_notes
      WHERE resident_id='622e6c8c-5c2b-4423-9216-016378102111'
        AND created_at >= '2025-07-01') < 30 THEN

    INSERT INTO nursing_notes (id, facility_id, resident_id, author_id, content, category, created_at)
    SELECT
      gen_random_uuid(),
      'facility-demo','622e6c8c-5c2b-4423-9216-016378102111','nurse-seed',
      CASE (idx % 10)
        WHEN 0 THEN 'عمر في جلسة العلاج الطبيعي اليوم. أكمل تمرين المشي 10 خطوات بمساعدة جزئية. المعالج الفيزيائي أشاد بتقدمه الملحوظ منذ الأسبوع الماضي.'
        WHEN 1 THEN 'قياسات الضغط اليوم 148/92. ما زال مرتفعاً لكن أفضل من الأسبوع الماضي 158/98. الطبيب قرر الحفاظ على الجرعة الحالية ومتابعة التحسن.'
        WHEN 2 THEN 'عمر تمكن من إمساك كوب الشاي بيده اليمنى الضعيفة وشرب منه. هذا تقدم كبير جداً. المعالج الوظيفي قدّر ذلك وأضاف تمارين الإمساك للخطة.'
        WHEN 3 THEN 'شكوى من ألم في الكتف الأيمن. تم تطبيق الكمادات الدافئة. المعالج الفيزيائي طلب تخفيف حدة تمارين الكتف مؤقتاً حتى يخف الألم.'
        WHEN 4 THEN 'سارة (ابنة عمر) زارت والدها وأحضرت معها حلويات منزلية. عمر سعيد جداً. تناول الحلوى ببطء وبتعاون مع أسلوب البلع الآمن الذي علّمه المعالج.'
        WHEN 5 THEN 'تحسن ملموس في الكلام. عمر ينطق الكلمات بشكل أوضح هذا الأسبوع. أخصائي النطق أكد التحسن ووصف تمارين لسانية إضافية للمنزل.'
        WHEN 6 THEN 'ضغط الدم اليوم 128/82 — أفضل قياس منذ الدخول. تم تبليغ الطبيب. قد يُنظَر في تخفيف جرعة خافض الضغط تدريجياً إذا استمر التحسن أسبوعاً آخر.'
        WHEN 7 THEN 'عمر شارك في مجموعة الدعم للمتعافين من السكتة الدماغية. تفاعل إيجابياً مع أقرانه. قال للممرضة: أنا أتحسن كل يوم. روح معنوية عالية.'
        WHEN 8 THEN 'فحص بلع اليوم: لا دلالات على الشفط أثناء الأكل. تم السماح بالأكل العادي مع الحرص على الطعام المفروم والشرب من أكواب خاصة.'
        ELSE         'تسليم وردية مسائية: عمر مستقر. قام بتمارين المشي في الممر وحيداً لـ5 خطوات. شهيته جيدة. الأدوية أُعطيت في وقتها. مزاجه إيجابي.'
      END,
      CASE (idx % 4) WHEN 0 THEN 'routine' WHEN 1 THEN 'concern' WHEN 2 THEN 'handoff' ELSE 'routine' END,
      TIMESTAMPTZ '2025-07-03 07:00:00+03' + (idx * INTERVAL '7 days')
    FROM generate_series(0, 47) AS idx;

  END IF;
END $no$;

-- ════════════════════════════════════════════════════════════════════════════
-- §7  DOCTOR VISITS — شهرياً لكل مقيم
-- ════════════════════════════════════════════════════════════════════════════

DO $dva$ BEGIN
  IF (SELECT COUNT(*) FROM doctor_visits
      WHERE resident_id='67697bba-1851-426b-9770-d8bc7dc8c705'
        AND visit_date >= '2025-06-01') < 8 THEN

    INSERT INTO doctor_visits (id, facility_id, resident_id, doctor_name, specialty,
      visit_date, purpose, results, created_by)
    SELECT
      gen_random_uuid(),
      'facility-demo','67697bba-1851-426b-9770-d8bc7dc8c705',
      CASE (mo % 3) WHEN 0 THEN 'Dr. Sami Al-Harbi' WHEN 1 THEN 'Dr. Layla Mansouri' ELSE 'Dr. Ibrahim Al-Otaibi' END,
      CASE (mo % 3) WHEN 0 THEN 'باطنية وقلبية' WHEN 1 THEN 'الغدد والسكري' ELSE 'باطنية عامة' END,
      (DATE '2025-06-15' + (mo * INTERVAL '1 month'))::date,
      CASE (mo % 4)
        WHEN 0 THEN 'متابعة دورية — ضغط الدم والسكري'
        WHEN 1 THEN 'مراجعة الأدوية وتعديل الجرعات'
        WHEN 2 THEN 'فحص دم شامل — HbA1c وصورة دموية'
        ELSE        'متابعة مضاعفات السكري والكلى'
      END,
      CASE (mo % 4)
        WHEN 0 THEN 'ضغط الدم 126/82 — جيد. HbA1c ' || (6.8 + (mo % 4) * 0.1)::text || '% — مقبول.'
        WHEN 1 THEN 'تم تعديل جرعة الميتفورمين. الاستجابة للعلاج جيدة. يُنصح بنظام غذائي منخفض السكر.'
        WHEN 2 THEN 'HbA1c ' || (6.7 + (mo % 3) * 0.1)::text || '% — تحسن. الكلى طبيعية. خضاب الدم 13.2 جم/ديسيلتر.'
        ELSE        'وظائف الكلى سليمة. فحص القدمين طبيعي. لا مضاعفات مستجدة.'
      END,
      'nurse-seed'
    FROM generate_series(0, 11) AS mo;

  END IF;
END $dva$;

DO $dvf$ BEGIN
  IF (SELECT COUNT(*) FROM doctor_visits
      WHERE resident_id='09d40b36-81e8-46ce-894b-d330bc9369f4'
        AND visit_date >= '2025-06-01') < 8 THEN

    INSERT INTO doctor_visits (id, facility_id, resident_id, doctor_name, specialty,
      visit_date, purpose, results, created_by)
    SELECT
      gen_random_uuid(),
      'facility-demo','09d40b36-81e8-46ce-894b-d330bc9369f4',
      CASE (mo % 2) WHEN 0 THEN 'Dr. Layla Mansouri' ELSE 'Dr. Khalid Nasser' END,
      CASE (mo % 2) WHEN 0 THEN 'أمراض القلب' ELSE 'جراحة الأعصاب والمعرفة' END,
      (DATE '2025-07-01' + (mo * INTERVAL '1 month'))::date,
      CASE (mo % 3)
        WHEN 0 THEN 'متابعة قصور القلب وتقييم السوائل'
        WHEN 1 THEN 'تقييم الوظائف المعرفية — مقياس MMSE'
        ELSE        'مراجعة الأدوية والوذمة'
      END,
      CASE (mo % 3)
        WHEN 0 THEN 'لا وذمة مستجدة. الوزن استقر. جرعة الفيوروسيميد مناسبة. إيكو القلب مستقر.'
        WHEN 1 THEN 'MMSE ' || (22 - (mo / 4))::text || '/30. تراجع معرفي خفيف مستقر. استمرار ريفاستيجمين.'
        ELSE        'الضغط 118/74 — جيد لمريضة بقصور القلب. لا وذمة. الأدوية ملائمة.'
      END,
      'nurse-seed'
    FROM generate_series(0, 11) AS mo;

  END IF;
END $dvf$;

DO $dvo$ BEGIN
  IF (SELECT COUNT(*) FROM doctor_visits
      WHERE resident_id='622e6c8c-5c2b-4423-9216-016378102111'
        AND visit_date >= '2025-07-01') < 8 THEN

    INSERT INTO doctor_visits (id, facility_id, resident_id, doctor_name, specialty,
      visit_date, purpose, results, created_by)
    SELECT
      gen_random_uuid(),
      'facility-demo','622e6c8c-5c2b-4423-9216-016378102111',
      CASE (mo % 2) WHEN 0 THEN 'Dr. Ibrahim Al-Otaibi' ELSE 'Dr. Sami Al-Harbi' END,
      CASE (mo % 2) WHEN 0 THEN 'أعصاب وإعادة تأهيل' ELSE 'باطنية وضغط الدم' END,
      (DATE '2025-07-15' + (mo * INTERVAL '1 month'))::date,
      CASE (mo % 3)
        WHEN 0 THEN 'متابعة إعادة التأهيل بعد السكتة الدماغية'
        WHEN 1 THEN 'تقييم ضغط الدم وتعديل العلاج'
        ELSE        'فحص البلع والتغذية'
      END,
      CASE (mo % 3)
        WHEN 0 THEN CASE WHEN mo < 4 THEN 'تحسن تدريجي في قوة الجانب الأيمن. العلاج الطبيعي مستمر يومياً.'
                    WHEN mo < 8 THEN 'تحسن ملموس. يمشي 15 خطوة بمساعدة جزئية. يُنصح بزيادة الجلسات.'
                    ELSE 'تحسن ممتاز. يمشي 30 خطوة مستقلاً. مرحلة التأهيل المتقدمة.' END
        WHEN 1 THEN 'ضغط الدم ' || CASE WHEN mo < 4 THEN '152/94' WHEN mo < 8 THEN '138/86' ELSE '126/80' END || '. ' ||
                    CASE WHEN mo < 4 THEN 'تعديل جرعة الكلوبيدوجريل.' WHEN mo < 8 THEN 'الاستجابة للعلاج جيدة.' ELSE 'ضغط الدم تحت السيطرة — ممتاز.' END
        ELSE        'البلع آمن مع الطعام المفروم. لا علامات شفط. يمكن الانتقال للطعام العادي تدريجياً.'
      END,
      'nurse-seed'
    FROM generate_series(0, 10) AS mo;

  END IF;
END $dvo$;

-- ════════════════════════════════════════════════════════════════════════════
-- §8  CARE TASKS — أسبوعياً لكل مقيم
-- ════════════════════════════════════════════════════════════════════════════

DO $cta$ BEGIN
  IF (SELECT COUNT(*) FROM care_tasks
      WHERE resident_id='67697bba-1851-426b-9770-d8bc7dc8c705'
        AND scheduled_time >= '2025-06-01') < 30 THEN

    INSERT INTO care_tasks (id, facility_id, resident_id, title, category,
      scheduled_time, is_completed, completed_by, completed_at)
    SELECT
      gen_random_uuid(),
      'facility-demo','67697bba-1851-426b-9770-d8bc7dc8c705',
      CASE (idx % 8)
        WHEN 0 THEN 'روتين النظافة الصباحية'
        WHEN 1 THEN 'جلسة المشي في الحديقة (30 دقيقة)'
        WHEN 2 THEN 'قياس سكر الدم ما قبل الفطور'
        WHEN 3 THEN 'جلسة العلاج الطبيعي الأسبوعية'
        WHEN 4 THEN 'تناول وجبة الإفطار مع الأدوية الصباحية'
        WHEN 5 THEN 'جلسة القراءة في مكتبة الجناح'
        WHEN 6 THEN 'قياس ضغط الدم المسائي'
        ELSE        'نشاط اجتماعي — مجموعة الدعم'
      END,
      CASE (idx % 4) WHEN 0 THEN 'personal' WHEN 1 THEN 'recreational' WHEN 2 THEN 'medical' ELSE 'social' END,
      TIMESTAMPTZ '2025-06-06 07:00:00+03' + (idx * INTERVAL '7 days'),
      TRUE,
      'nurse-seed',
      TIMESTAMPTZ '2025-06-06 07:30:00+03' + (idx * INTERVAL '7 days')
    FROM generate_series(0, 51) AS idx;

  END IF;
END $cta$;

DO $ctf$ BEGIN
  IF (SELECT COUNT(*) FROM care_tasks
      WHERE resident_id='09d40b36-81e8-46ce-894b-d330bc9369f4'
        AND scheduled_time >= '2025-06-01') < 30 THEN

    INSERT INTO care_tasks (id, facility_id, resident_id, title, category,
      scheduled_time, is_completed, completed_by, completed_at)
    SELECT
      gen_random_uuid(),
      'facility-demo','09d40b36-81e8-46ce-894b-d330bc9369f4',
      CASE (idx % 8)
        WHEN 0 THEN 'وزن المريضة وتوثيق السوائل'
        WHEN 1 THEN 'جلسة تنشيط الذاكرة بالصور'
        WHEN 2 THEN 'تغيير لصقة الريفاستيجمين'
        WHEN 3 THEN 'جلسة الموسيقى العلاجية'
        WHEN 4 THEN 'فحص الكاحلين للوذمة'
        WHEN 5 THEN 'نزهة في الحديقة مع الكرسي المتحرك'
        WHEN 6 THEN 'جلسة العلاج التذكاري مع الصور القديمة'
        ELSE        'حمام دافئ ونظافة شخصية متكاملة'
      END,
      CASE (idx % 4) WHEN 0 THEN 'medical' WHEN 1 THEN 'recreational' WHEN 2 THEN 'personal' ELSE 'social' END,
      TIMESTAMPTZ '2025-06-20 09:00:00+03' + (idx * INTERVAL '7 days'),
      idx % 5 <> 4,
      CASE WHEN idx % 5 <> 4 THEN 'nurse-seed' ELSE NULL END,
      CASE WHEN idx % 5 <> 4 THEN TIMESTAMPTZ '2025-06-20 09:30:00+03' + (idx * INTERVAL '7 days') ELSE NULL END
    FROM generate_series(0, 49) AS idx;

  END IF;
END $ctf$;

DO $cto$ BEGIN
  IF (SELECT COUNT(*) FROM care_tasks
      WHERE resident_id='622e6c8c-5c2b-4423-9216-016378102111'
        AND scheduled_time >= '2025-07-01') < 30 THEN

    INSERT INTO care_tasks (id, facility_id, resident_id, title, category,
      scheduled_time, is_completed, completed_by, completed_at)
    SELECT
      gen_random_uuid(),
      'facility-demo','622e6c8c-5c2b-4423-9216-016378102111',
      CASE (idx % 8)
        WHEN 0 THEN 'جلسة العلاج الطبيعي — تمارين الجانب الأيمن'
        WHEN 1 THEN 'تمرين المشي في الممر بالمساعدة'
        WHEN 2 THEN 'جلسة علاج النطق والبلع'
        WHEN 3 THEN 'تمارين اليد والإمساك (كرة الإسفنج)'
        WHEN 4 THEN 'قياس ضغط الدم 3 مرات يومياً'
        WHEN 5 THEN 'جلسة الدعم النفسي مع الأخصائية'
        WHEN 6 THEN 'تمارين التوازن على الكرسي'
        ELSE        'نشاط ترفيهي — مشاهدة التلفاز مع زملائه'
      END,
      CASE (idx % 4) WHEN 0 THEN 'medical' WHEN 1 THEN 'personal' WHEN 2 THEN 'recreational' ELSE 'social' END,
      TIMESTAMPTZ '2025-07-04 08:00:00+03' + (idx * INTERVAL '7 days'),
      TRUE,
      'nurse-seed',
      TIMESTAMPTZ '2025-07-04 08:45:00+03' + (idx * INTERVAL '7 days')
    FROM generate_series(0, 47) AS idx;

  END IF;
END $cto$;

-- ════════════════════════════════════════════════════════════════════════════
-- §9  DOSE LOGS — عينة شهرية (التزام الأدوية)
-- ════════════════════════════════════════════════════════════════════════════
DO $dl$ BEGIN
  IF (SELECT COUNT(*) FROM dose_logs
      WHERE facility_id='facility-demo'
        AND scheduled_time >= '2025-06-01') < 30 THEN

    INSERT INTO dose_logs (id, schedule_id, resident_id, facility_id,
      scheduled_time, status, administered_at, administered_by)
    SELECT
      gen_random_uuid(),
      'msaa0001-0000-0000-0000-000000000001',
      '67697bba-1851-426b-9770-d8bc7dc8c705',
      'facility-demo',
      TIMESTAMPTZ '2025-06-07 08:00:00+03' + (mo * INTERVAL '14 days'),
      CASE WHEN mo % 9 = 7 THEN 'skipped' ELSE 'given' END,
      CASE WHEN mo % 9 = 7 THEN NULL
           ELSE TIMESTAMPTZ '2025-06-07 08:10:00+03' + (mo * INTERVAL '14 days') END,
      CASE WHEN mo % 9 = 7 THEN NULL ELSE 'nurse-seed' END
    FROM generate_series(0, 23) AS mo;

    INSERT INTO dose_logs (id, schedule_id, resident_id, facility_id,
      scheduled_time, status, administered_at, administered_by)
    SELECT
      gen_random_uuid(),
      'msff0001-0000-0000-0000-000000000001',
      '09d40b36-81e8-46ce-894b-d330bc9369f4',
      'facility-demo',
      TIMESTAMPTZ '2025-06-21 07:00:00+03' + (mo * INTERVAL '14 days'),
      CASE WHEN mo % 12 = 10 THEN 'late' ELSE 'given' END,
      CASE WHEN mo % 12 = 10 THEN TIMESTAMPTZ '2025-06-21 09:30:00+03' + (mo * INTERVAL '14 days')
           ELSE TIMESTAMPTZ '2025-06-21 07:08:00+03' + (mo * INTERVAL '14 days') END,
      'nurse-seed'
    FROM generate_series(0, 22) AS mo;

    INSERT INTO dose_logs (id, schedule_id, resident_id, facility_id,
      scheduled_time, status, administered_at, administered_by)
    SELECT
      gen_random_uuid(),
      'msoo0001-0000-0000-0000-000000000001',
      '622e6c8c-5c2b-4423-9216-016378102111',
      'facility-demo',
      TIMESTAMPTZ '2025-07-05 08:00:00+03' + (mo * INTERVAL '14 days'),
      'given',
      TIMESTAMPTZ '2025-07-05 08:07:00+03' + (mo * INTERVAL '14 days'),
      'nurse-seed'
    FROM generate_series(0, 21) AS mo;

  END IF;
END $dl$;

-- ════════════════════════════════════════════════════════════════════════════
-- §10  SHIFT HANDOFFS — مرتين شهرياً
-- ════════════════════════════════════════════════════════════════════════════
DO $sh$ BEGIN
  IF (SELECT COUNT(*) FROM shift_handoffs
      WHERE facility_id='facility-demo'
        AND shift_date >= '2025-06-01') < 10 THEN

    INSERT INTO shift_handoffs (id, facility_id, outgoing_nurse_id, incoming_nurse_id,
      shift_date, shift_type, summary, residents_covered, pending_tasks)
    SELECT
      gen_random_uuid(),
      'facility-demo','nurse-seed','nurse-evening',
      (DATE '2025-06-05' + (mo * INTERVAL '15 days'))::date,
      CASE WHEN mo % 3 = 0 THEN 'morning' WHEN mo % 3 = 1 THEN 'evening' ELSE 'night' END,
      CASE (mo % 6)
        WHEN 0 THEN 'جميع المقيمين مستقرون. أحمد يحتاج إعادة قياس ضغط الدم الساعة 14:00. فاطمة تناولت وجباتها بانتظام. عمر أكمل جلسة العلاج الطبيعي بنجاح.'
        WHEN 1 THEN 'أحمد أفاد بدوار خفيف بعد الغداء — تمت ملاحظته. فاطمة في حالة جيدة. عمر يتقدم في تمارين المشي.'
        WHEN 2 THEN 'وردية هادئة. الأدوية المسائية أُعطيت لجميع المقيمين في وقتها. لا أحداث طارئة.'
        WHEN 3 THEN 'فاطمة تشعر بتعب غير معتاد. تم قياس نبضها كل ساعة. الطبيب أُخطر. أحمد زارته عائلته اليوم.'
        WHEN 4 THEN 'عمر حقق تقدماً ملحوظاً في جلسة العلاج الوظيفي. تمكن من كتابة اسمه باليد اليمنى للمرة الأولى منذ السكتة.'
        ELSE        'وردية ليلية هادئة. تمت جولات المراقبة كل ساعتين. جميع المقيمين نائمون. لا مستجدات.'
      END,
      '["67697bba-1851-426b-9770-d8bc7dc8c705","09d40b36-81e8-46ce-894b-d330bc9369f4","622e6c8c-5c2b-4423-9216-016378102111"]',
      '[{"task":"قياس ضغط أحمد","due":"14:00"},{"task":"أدوية المساء للجميع","due":"20:00"}]'
    FROM generate_series(0, 23) AS mo;

  END IF;
END $sh$;

-- ════════════════════════════════════════════════════════════════════════════
-- §11  SOCIAL ASSESSMENT TOOLS
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO social_assessment_tools (id, facility_id, name, subtitle, score, status, icon)
VALUES
  ('sat10001-0000-0000-0000-000000000001','facility-demo',
   'مقياس الاكتئاب الجرياتري GDS','تقييم الحالة المزاجية للمسنين','6/15','مكتمل','mood'),
  ('sat10002-0000-0000-0000-000000000001','facility-demo',
   'مقياس بارثيل للأنشطة اليومية','تقييم الاستقلالية الوظيفية','65/100','مكتمل','accessibility'),
  ('sat10003-0000-0000-0000-000000000001','facility-demo',
   'مقياس برغ للتوازن','تقييم خطر السقوط','38/56','مكتمل','balance'),
  ('sat10004-0000-0000-0000-000000000001','facility-demo',
   'مقياس MNA للتغذية','تقييم الحالة الغذائية','20/30','مكتمل','restaurant')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- §12  SOCIAL ASSESSMENTS — ربع سنوي لكل مقيم
-- ════════════════════════════════════════════════════════════════════════════
DO $sa$ BEGIN
  IF (SELECT COUNT(*) FROM social_assessments
      WHERE facility_id='facility-demo'
        AND created_at >= '2025-06-01') < 6 THEN

    -- Ahmad: quarterly GDS assessments
    INSERT INTO social_assessments (id, facility_id, resident_id, scores,
      needs_intervention, notes, assessed_by, created_at)
    VALUES
      ('ssa10001-0000-0000-0000-000000000001','facility-demo',
       '67697bba-1851-426b-9770-d8bc7dc8c705',
       '{"gds_q1":"نعم","gds_q2":"لا","gds_q3":"لا","gds_q4":"أحياناً","gds_q5":"نعم","gds_q6":"نادراً","gds_q7":8,"gds_q8":"أشعر بالرضا وإن كنت أفتقد حياتي القديمة","total":2,"interpretation":"لا اكتئاب"}',
       FALSE,'أحمد في حالة نفسية جيدة. يتكيف بشكل إيجابي مع البيئة الجديدة. ينتظر زيارات عائلته بشوق.','specialist-seed',
       '2025-08-15 10:00:00+03'),
      ('ssa10002-0000-0000-0000-000000000001','facility-demo',
       '67697bba-1851-426b-9770-d8bc7dc8c705',
       '{"gds_q1":"نعم","gds_q2":"لا","gds_q3":"لا","gds_q4":"لا","gds_q5":"نعم","gds_q6":"نادراً","gds_q7":9,"gds_q8":"أنا بخير والعائلة تزورني باستمرار","total":1,"interpretation":"لا اكتئاب"}',
       FALSE,'تحسن ملحوظ في الرفاه النفسي مقارنة بالتقييم السابق. المشاركة الاجتماعية إيجابية.','specialist-seed',
       '2025-11-15 10:00:00+03'),
      ('ssa10003-0000-0000-0000-000000000001','facility-demo',
       '67697bba-1851-426b-9770-d8bc7dc8c705',
       '{"gds_q1":"نعم","gds_q2":"لا","gds_q3":"لا","gds_q4":"لا","gds_q5":"نعم","gds_q6":"نادراً","gds_q7":9,"gds_q8":"أحب المكان وزملائي هنا","total":1,"interpretation":"لا اكتئاب"}',
       FALSE,'أحمد مستقر نفسياً ومتفاعل اجتماعياً. يشارك في جميع الأنشطة الجماعية.','specialist-seed',
       '2026-02-15 10:00:00+03'),

      -- Fatimah: quarterly GDS
      ('ssf10001-0000-0000-0000-000000000001','facility-demo',
       '09d40b36-81e8-46ce-894b-d330bc9369f4',
       '{"gds_q1":"أحياناً","gds_q2":"نعم","gds_q3":"أحياناً","gds_q4":"نعم","gds_q5":"أحياناً","gds_q6":"أحياناً جداً","gds_q7":5,"gds_q8":"أتذكر أشياء ثم أنساها مما يزعجني","total":6,"interpretation":"اكتئاب خفيف — يحتاج متابعة"}',
       TRUE,'فاطمة تعاني من قلق مرتبط بالتراجع المعرفي. تحتاج جلسات دعم نفسي أسبوعية وأنشطة تنشيط الذاكرة.','specialist-seed',
       '2025-09-01 10:00:00+03'),
      ('ssf10002-0000-0000-0000-000000000001','facility-demo',
       '09d40b36-81e8-46ce-894b-d330bc9369f4',
       '{"gds_q1":"نعم","gds_q2":"أحياناً","gds_q3":"لا","gds_q4":"أحياناً","gds_q5":"نعم","gds_q6":"نادراً","gds_q7":6,"gds_q8":"أتذكر أكثر عندما أرى الصور القديمة","total":4,"interpretation":"لا اكتئاب — تحسن"}',
       FALSE,'تحسن واضح بعد تطبيق برنامج العلاج التذكاري. الجلسات الموسيقية أسهمت إيجابياً في رفع المزاج.','specialist-seed',
       '2025-12-01 10:00:00+03'),
      ('ssf10003-0000-0000-0000-000000000001','facility-demo',
       '09d40b36-81e8-46ce-894b-d330bc9369f4',
       '{"gds_q1":"نعم","gds_q2":"لا","gds_q3":"لا","gds_q4":"لا","gds_q5":"نعم","gds_q6":"نادراً","gds_q7":7,"gds_q8":"محمد يزورني كثيراً وهذا يسعدني","total":2,"interpretation":"لا اكتئاب"}',
       FALSE,'تحسن مستمر. زيارات العائلة المنتظمة لها أثر إيجابي واضح على الحالة النفسية.','specialist-seed',
       '2026-03-01 10:00:00+03'),

      -- Omar: assessments
      ('sso10001-0000-0000-0000-000000000001','facility-demo',
       '622e6c8c-5c2b-4423-9216-016378102111',
       '{"gds_q1":"لا","gds_q2":"نعم","gds_q3":"أحياناً","gds_q4":"نعم","gds_q5":"لا","gds_q6":"أحياناً جداً","gds_q7":4,"gds_q8":"أخاف ألا أتعافى بالكامل وهذا يقلقني","total":7,"interpretation":"اكتئاب خفيف"}',
       TRUE,'إحباط مرتبط بضعف الجانب الأيمن وبطء التعافي. يحتاج جلسات دعم نفسي ومجموعة دعم للمتعافين من السكتة.','specialist-seed',
       '2025-09-15 10:00:00+03'),
      ('sso10002-0000-0000-0000-000000000001','facility-demo',
       '622e6c8c-5c2b-4423-9216-016378102111',
       '{"gds_q1":"نعم","gds_q2":"أحياناً","gds_q3":"لا","gds_q4":"لا","gds_q5":"نعم","gds_q6":"نادراً","gds_q7":7,"gds_q8":"أشعر بالفخر كلما تقدمت خطوة جديدة","total":3,"interpretation":"لا اكتئاب — تحسن كبير"}',
       FALSE,'تحسن درامي مقارنة بالتقييم الأول. تقدم إعادة التأهيل يعطي عمر دافعاً نفسياً قوياً.','specialist-seed',
       '2025-12-15 10:00:00+03'),
      ('sso10003-0000-0000-0000-000000000001','facility-demo',
       '622e6c8c-5c2b-4423-9216-016378102111',
       '{"gds_q1":"نعم","gds_q2":"لا","gds_q3":"لا","gds_q4":"لا","gds_q5":"نعم","gds_q6":"نادراً","gds_q7":8,"gds_q8":"أنا متفائل وسأعود لمنزلي قريباً","total":1,"interpretation":"لا اكتئاب — ممتاز"}',
       FALSE,'روح معنوية عالية جداً. عمر يضع أهدافاً واضحة للتعافي ويعمل عليها بجدية.','specialist-seed',
       '2026-03-15 10:00:00+03');

  END IF;
END $sa$;

-- ════════════════════════════════════════════════════════════════════════════
-- §13  SOCIAL NEEDS
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO social_needs (id, facility_id, type, room_number, is_urgent, label, created_by)
VALUES
  ('sn000001-0000-0000-0000-000000000001','facility-demo','نفسي','101',FALSE,'يحتاج دعماً نفسياً للتكيف مع بيئة الرعاية','specialist-seed'),
  ('sn000002-0000-0000-0000-000000000001','facility-demo','اجتماعي','205',FALSE,'تحتاج زيارات عائلية أكثر انتظاماً لتحسين المزاج','specialist-seed'),
  ('sn000003-0000-0000-0000-000000000001','facility-demo','نفسي','312',TRUE,'يعاني من إحباط بسبب بطء التعافي — تدخل فوري','specialist-seed'),
  ('sn000004-0000-0000-0000-000000000001','facility-demo','مادي','101',FALSE,'العائلة تطلب مساعدة في فهم الفواتير الشهرية','specialist-seed'),
  ('sn000005-0000-0000-0000-000000000001','facility-demo','ترفيهي','205',FALSE,'تطلب المقيمة برامج موسيقية وتراثية بشكل أسبوعي','specialist-seed'),
  ('sn000006-0000-0000-0000-000000000001','facility-demo','اجتماعي','312',FALSE,'يرغب في التواصل مع مجموعة دعم متعافين من السكتة','specialist-seed'),
  ('sn000007-0000-0000-0000-000000000001','facility-demo','نفسي','101',FALSE,'القلق من مضاعفات السكري يؤثر على نومه','specialist-seed'),
  ('sn000008-0000-0000-0000-000000000001','facility-demo','ديني','205',FALSE,'تطلب المقيمة حضور دروس القرآن الكريم الأسبوعية','specialist-seed')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- §14  FAMILY BILLS — 12 شهراً لكل مقيم
-- ════════════════════════════════════════════════════════════════════════════
DO $fb$ BEGIN
  IF (SELECT COUNT(*) FROM family_bills
      WHERE facility_id='facility-demo'
        AND due_date >= '2025-07-01') < 15 THEN

    INSERT INTO family_bills (id, facility_id, resident_id, title, month, amount, is_paid, due_date)
    SELECT
      gen_random_uuid(),
      'facility-demo','67697bba-1851-426b-9770-d8bc7dc8c705',
      'رسوم الرعاية الشهرية — ' || TO_CHAR(DATE '2025-06-01' + (mo * INTERVAL '1 month'), 'YYYY-MM'),
      TO_CHAR(DATE '2025-06-01' + (mo * INTERVAL '1 month'), 'YYYY-MM'),
      CASE WHEN mo % 4 = 3 THEN 5500.00 ELSE 5000.00 END,
      mo < 10,
      (DATE '2025-07-01' + (mo * INTERVAL '1 month'))::date
    FROM generate_series(0, 11) AS mo;

    INSERT INTO family_bills (id, facility_id, resident_id, title, month, amount, is_paid, due_date)
    SELECT
      gen_random_uuid(),
      'facility-demo','09d40b36-81e8-46ce-894b-d330bc9369f4',
      'رسوم الرعاية الشهرية — ' || TO_CHAR(DATE '2025-06-15' + (mo * INTERVAL '1 month'), 'YYYY-MM'),
      TO_CHAR(DATE '2025-06-15' + (mo * INTERVAL '1 month'), 'YYYY-MM'),
      4500.00,
      mo < 10,
      (DATE '2025-07-15' + (mo * INTERVAL '1 month'))::date
    FROM generate_series(0, 11) AS mo;

    INSERT INTO family_bills (id, facility_id, resident_id, title, month, amount, is_paid, due_date)
    SELECT
      gen_random_uuid(),
      'facility-demo','622e6c8c-5c2b-4423-9216-016378102111',
      'رسوم الرعاية الشهرية — ' || TO_CHAR(DATE '2025-07-01' + (mo * INTERVAL '1 month'), 'YYYY-MM'),
      TO_CHAR(DATE '2025-07-01' + (mo * INTERVAL '1 month'), 'YYYY-MM'),
      CASE WHEN mo < 6 THEN 6000.00 ELSE 5000.00 END,
      mo < 9,
      (DATE '2025-08-01' + (mo * INTERVAL '1 month'))::date
    FROM generate_series(0, 10) AS mo;

  END IF;
END $fb$;

-- ════════════════════════════════════════════════════════════════════════════
-- §15  ACTIVITY SESSIONS — مرتان شهرياً
-- ════════════════════════════════════════════════════════════════════════════
DO $as_$ BEGIN
  IF (SELECT COUNT(*) FROM activity_sessions
      WHERE facility_id='facility-demo'
        AND start_time >= '2025-06-01') < 10 THEN

    INSERT INTO activity_sessions (id, facility_id, title, description, start_time,
      location, participants, created_by)
    SELECT
      gen_random_uuid(),
      'facility-demo',
      CASE (idx % 8)
        WHEN 0 THEN 'جلسة اليوغا الصباحية للمسنين'
        WHEN 1 THEN 'ورشة الخط العربي والرسم'
        WHEN 2 THEN 'أمسية موسيقى تراثية'
        WHEN 3 THEN 'مسابقة الذكريات الثقافية'
        WHEN 4 THEN 'جلسة القرآن الكريم والذكر'
        WHEN 5 THEN 'يوم الطبيعة — رحلة الحديقة'
        WHEN 6 THEN 'ورشة الطبخ الصحي للمسنين'
        ELSE        'مجموعة الدعم الاجتماعي الأسبوعية'
      END,
      CASE (idx % 4)
        WHEN 0 THEN 'نشاط بدني خفيف يناسب كبار السن للحفاظ على المرونة والتوازن'
        WHEN 1 THEN 'نشاط إبداعي وترفيهي يحفز التركيز والذاكرة'
        WHEN 2 THEN 'نشاط روحي وثقافي يعزز الطمأنينة والانتماء'
        ELSE        'نشاط اجتماعي يعزز الروابط ومهارات التواصل'
      END,
      TIMESTAMPTZ '2025-06-10 09:00:00+03' + (idx * INTERVAL '15 days'),
      CASE (idx % 3) WHEN 0 THEN 'قاعة الأنشطة' WHEN 1 THEN 'الحديقة الخارجية' ELSE 'غرفة الترفيه' END,
      '["67697bba-1851-426b-9770-d8bc7dc8c705","09d40b36-81e8-46ce-894b-d330bc9369f4","622e6c8c-5c2b-4423-9216-016378102111"]',
      CASE WHEN idx % 2 = 0 THEN 'nurse-seed' ELSE 'volunteer-seed' END
    FROM generate_series(0, 23) AS idx;

  END IF;
END $as_$;

-- ════════════════════════════════════════════════════════════════════════════
-- §16  VISITS — زيارات عائلية شهرية
-- ════════════════════════════════════════════════════════════════════════════
DO $vi$ BEGIN
  IF (SELECT COUNT(*) FROM visits
      WHERE facility_id='facility-demo'
        AND visit_date >= '2025-06-01') < 15 THEN

    INSERT INTO visits (id, resident_id, facility_id, visitor_name, visitor_relationship,
      booked_by, visit_date, visit_time_start, visit_time_end, status, approved_by, notes)
    SELECT
      gen_random_uuid(),
      '67697bba-1851-426b-9770-d8bc7dc8c705','facility-demo',
      'خالد الراشد','ابن','family-ahmad-seed',
      (DATE '2025-06-14' + (mo * INTERVAL '1 month'))::date,
      '10:00','12:00',
      CASE WHEN mo < 10 THEN 'completed' WHEN mo = 10 THEN 'approved' ELSE 'pending' END,
      CASE WHEN mo < 11 THEN 'admin-seed' ELSE NULL END,
      CASE (mo % 3) WHEN 0 THEN 'زيارة اعتيادية — العائلة تحضر معها الغداء' WHEN 1 THEN 'مناسبة خاصة — عيد ميلاد' ELSE NULL END
    FROM generate_series(0, 11) AS mo;

    INSERT INTO visits (id, resident_id, facility_id, visitor_name, visitor_relationship,
      booked_by, visit_date, visit_time_start, visit_time_end, status, approved_by)
    SELECT
      gen_random_uuid(),
      '09d40b36-81e8-46ce-894b-d330bc9369f4','facility-demo',
      'محمد الزهراني','ابن','family-fatimah-seed',
      (DATE '2025-06-21' + (mo * INTERVAL '1 month'))::date,
      '14:00','16:00',
      CASE WHEN mo < 10 THEN 'completed' WHEN mo = 10 THEN 'approved' ELSE 'pending' END,
      CASE WHEN mo < 11 THEN 'admin-seed' ELSE NULL END
    FROM generate_series(0, 11) AS mo;

    INSERT INTO visits (id, resident_id, facility_id, visitor_name, visitor_relationship,
      booked_by, visit_date, visit_time_start, visit_time_end, status, approved_by)
    SELECT
      gen_random_uuid(),
      '622e6c8c-5c2b-4423-9216-016378102111','facility-demo',
      'سارة الغامدي','ابنة','family-omar-seed',
      (DATE '2025-07-07' + (mo * INTERVAL '1 month'))::date,
      '11:00','13:00',
      CASE WHEN mo < 9 THEN 'completed' WHEN mo = 9 THEN 'approved' ELSE 'pending' END,
      CASE WHEN mo < 10 THEN 'admin-seed' ELSE NULL END
    FROM generate_series(0, 10) AS mo;

  END IF;
END $vi$;

-- ════════════════════════════════════════════════════════════════════════════
-- §17  MEMORY MOMENTS
-- ════════════════════════════════════════════════════════════════════════════
DO $mm$ BEGIN
  IF (SELECT COUNT(*) FROM memory_moments
      WHERE facility_id='facility-demo'
        AND uploaded_by IN ('nurse-seed','volunteer-seed')) < 10 THEN

    INSERT INTO memory_moments (id, facility_id, resident_id, image_url,
      activity_title, appreciations, uploaded_by)
    VALUES
      ('mm0a0001-0000-0000-0000-000000000001','facility-demo',
       '67697bba-1851-426b-9770-d8bc7dc8c705',
       'https://storage.googleapis.com/wanas-media/memories/ahmad-garden-walk.jpg',
       'نزهة أحمد في الحديقة',12,'nurse-seed'),
      ('mm0a0002-0000-0000-0000-000000000001','facility-demo',
       '67697bba-1851-426b-9770-d8bc7dc8c705',
       'https://storage.googleapis.com/wanas-media/memories/ahmad-family-visit.jpg',
       'زيارة عائلة أحمد — العيد',28,'nurse-seed'),
      ('mm0a0003-0000-0000-0000-000000000001','facility-demo',
       '67697bba-1851-426b-9770-d8bc7dc8c705',
       'https://storage.googleapis.com/wanas-media/memories/ahmad-yoga.jpg',
       'جلسة اليوغا الصباحية',8,'volunteer-seed'),
      ('mm0a0004-0000-0000-0000-000000000001','facility-demo',
       '67697bba-1851-426b-9770-d8bc7dc8c705',
       'https://storage.googleapis.com/wanas-media/memories/ahmad-calligraphy.jpg',
       'ورشة الخط العربي',15,'volunteer-seed'),
      ('mm0f0001-0000-0000-0000-000000000001','facility-demo',
       '09d40b36-81e8-46ce-894b-d330bc9369f4',
       'https://storage.googleapis.com/wanas-media/memories/fatimah-music.jpg',
       'أمسية الموسيقى التراثية',22,'volunteer-seed'),
      ('mm0f0002-0000-0000-0000-000000000001','facility-demo',
       '09d40b36-81e8-46ce-894b-d330bc9369f4',
       'https://storage.googleapis.com/wanas-media/memories/fatimah-family.jpg',
       'زيارة محمد لأمه فاطمة',35,'nurse-seed'),
      ('mm0f0003-0000-0000-0000-000000000001','facility-demo',
       '09d40b36-81e8-46ce-894b-d330bc9369f4',
       'https://storage.googleapis.com/wanas-media/memories/fatimah-garden.jpg',
       'جلسة الحديقة المسائية',10,'nurse-seed'),
      ('mm0o0001-0000-0000-0000-000000000001','facility-demo',
       '622e6c8c-5c2b-4423-9216-016378102111',
       'https://storage.googleapis.com/wanas-media/memories/omar-first-steps.jpg',
       'عمر يمشي خطواته الأولى بعد السكتة',47,'nurse-seed'),
      ('mm0o0002-0000-0000-0000-000000000001','facility-demo',
       '622e6c8c-5c2b-4423-9216-016378102111',
       'https://storage.googleapis.com/wanas-media/memories/omar-writing.jpg',
       'عمر يكتب اسمه باليد اليمنى',31,'volunteer-seed'),
      ('mm0o0003-0000-0000-0000-000000000001','facility-demo',
       '622e6c8c-5c2b-4423-9216-016378102111',
       'https://storage.googleapis.com/wanas-media/memories/omar-daughter-visit.jpg',
       'زيارة سارة لوالدها عمر',19,'nurse-seed');

  END IF;
END $mm$;

-- ════════════════════════════════════════════════════════════════════════════
-- §18  VOLUNTEER DATA
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO volunteer_profiles (id, user_id, facility_id, name, bio, location,
  skills, hours_logged, social_links)
VALUES
  ('vpr10001-0000-0000-0000-000000000001','volunteer-seed','facility-demo',
   'إبراهيم المطيري',
   'متطوع متحمس في رعاية كبار السن منذ 3 سنوات. حاصل على شهادة الإسعافات الأولية ودورة رعاية المسنين من الهلال الأحمر.',
   'الرياض — المملكة العربية السعودية',
   '["الإسعافات الأولية","العلاج بالموسيقى","الخط العربي","القراءة التراثية","تمارين التوازن"]',
   148,
   '{"twitter":"@ibrahim_care","linkedin":"ibrahim-mutairi"}')
ON CONFLICT (user_id) DO UPDATE SET hours_logged = EXCLUDED.hours_logged;

INSERT INTO volunteer_opportunities (id, facility_id, title, org, hours, points,
  tags, description, total_slots, filled_slots, date_info)
VALUES
  ('vop10001-0000-0000-0000-000000000001','facility-demo',
   'يوم صيانة الحديقة','وناس للرعاية',3,30,
   '["خارجي","بستنة","طبيعة"]',
   'المساعدة في صيانة الحديقة وزراعة الزهور لتوفير بيئة جميلة للمقيمين.',
   5,2,'كل سبت 9:00-12:00'),
  ('vop10002-0000-0000-0000-000000000001','facility-demo',
   'برنامج رفيق القراءة','وناس للرعاية',2,20,
   '["داخلي","قراءة","مصاحبة"]',
   'قراءة الكتب والصحف وقصص التراث للمقيمين.',
   3,1,'أيام الأسبوع 14:00-16:00'),
  ('vop10003-0000-0000-0000-000000000001','facility-demo',
   'مساعد العلاج بالموسيقى','وناس للرعاية',2,25,
   '["داخلي","موسيقى","علاج"]',
   'المساعدة في إدارة جلسات الموسيقى الجماعية العلاجية.',
   2,1,'الثلاثاء والخميس 10:00-12:00'),
  ('vop10004-0000-0000-0000-000000000001','facility-demo',
   'ورشة الخط العربي','وناس للرعاية',2,20,
   '["داخلي","فن","إبداع"]',
   'تعليم الخط العربي كنشاط علاجي يحفز الذاكرة والتركيز.',
   4,2,'الأحد 10:00-12:00'),
  ('vop10005-0000-0000-0000-000000000001','facility-demo',
   'جلسات الاستماع والمصاحبة','وناس للرعاية',2,15,
   '["داخلي","دعم نفسي","مصاحبة"]',
   'الجلوس والاستماع للمقيمين ومشاركتهم قصصهم وذكرياتهم.',
   6,3,'يومياً 16:00-18:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO volunteer_bookings (id, facility_id, volunteer_id, opportunity_id, status)
SELECT
  gen_random_uuid(),'facility-demo',
  'vpr10001-0000-0000-0000-000000000001',
  opp.id,
  CASE WHEN opp.id IN (
    'vop10001-0000-0000-0000-000000000001',
    'vop10002-0000-0000-0000-000000000001',
    'vop10003-0000-0000-0000-000000000001'
  ) THEN 'done' ELSE 'confirmed' END
FROM (VALUES
  ('vop10001-0000-0000-0000-000000000001'::uuid),
  ('vop10002-0000-0000-0000-000000000001'::uuid),
  ('vop10003-0000-0000-0000-000000000001'::uuid),
  ('vop10004-0000-0000-0000-000000000001'::uuid),
  ('vop10005-0000-0000-0000-000000000001'::uuid)
) AS opp(id)
WHERE NOT EXISTS (
  SELECT 1 FROM volunteer_bookings vb
  WHERE vb.volunteer_id = 'vpr10001-0000-0000-0000-000000000001'
    AND vb.opportunity_id = opp.id
);

INSERT INTO volunteer_ratings (id, volunteer_id, from_name, category, score, comment, date, chips, criteria_scores)
VALUES
  ('vrt10001-0000-0000-0000-000000000001',
   'vpr10001-0000-0000-0000-000000000001',
   'الممرضة هالة','جلسة الموسيقى',4.8,
   'إبراهيم ممتاز مع المقيمين — يتعامل بصبر وحنان واضح وتفاعله مع فاطمة كان رائعاً.',
   '2025-09-15','["منضبط","ودود","متعاون"]',
   '{"التواصل":5.0,"الموثوقية":4.5,"الاتجاه":5.0}'),
  ('vrt10002-0000-0000-0000-000000000001',
   'vpr10001-0000-0000-0000-000000000001',
   'المشرفة ريم','يوم الحديقة',4.5,
   'عمل بجهد طوال اليوم ونظّم الحديقة بشكل احترافي. المقيمون أحبوا النتيجة.',
   '2025-10-12','["مجتهد","إيجابي","منظم"]',
   '{"التواصل":4.5,"الموثوقية":4.5,"الاتجاه":4.5}'),
  ('vrt10003-0000-0000-0000-000000000001',
   'vpr10001-0000-0000-0000-000000000001',
   'د. نورة الشهراني','جلسة الدعم النفسي',5.0,
   'إبراهيم أحدث فارقاً كبيراً مع عمر — أعطاه أملاً وثقة في رحلة التعافي.',
   '2025-11-20','["متعاطف","ملهم","متفاعل"]',
   '{"التواصل":5.0,"الموثوقية":5.0,"الاتجاه":5.0}'),
  ('vrt10004-0000-0000-0000-000000000001',
   'vpr10001-0000-0000-0000-000000000001',
   'الممرضة منيرة','ورشة الخط العربي',4.7,
   'الورشة كانت ناجحة جداً — أحمد كتب جملة كاملة بالخط الديواني وفرح بها كثيراً.',
   '2025-12-08','["ملتزم","مبدع","مثابر"]',
   '{"التواصل":4.5,"الموثوقية":5.0,"الاتجاه":4.5}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO volunteer_certificates (id, volunteer_id, name, award_date, description, is_locked, progress)
VALUES
  ('vce10001-0000-0000-0000-000000000001',
   'vpr10001-0000-0000-0000-000000000001',
   'شهادة الإسعافات الأولية المتقدمة','2025-03-01',
   'إتمام دورة الإسعافات الأولية المتقدمة للمسنين من الهلال الأحمر السعودي',FALSE,100),
  ('vce10002-0000-0000-0000-000000000001',
   'vpr10001-0000-0000-0000-000000000001',
   'بطل المجتمع المتطوع',NULL,
   'تسجيل 150 ساعة تطوع في خدمة كبار السن',TRUE,99),
  ('vce10003-0000-0000-0000-000000000001',
   'vpr10001-0000-0000-0000-000000000001',
   'متطوع الربع — أكتوبر 2025','2025-10-31',
   'أعلى تقييم بين المتطوعين خلال الربع الثالث',FALSE,100)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- §19  COMPLAINTS — متنوعة على مدار السنة
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO complaints (id, resident_id, facility_id, submitted_by, category,
  subject, description, status, priority, resolved_by, resolved_at, resolution_notes)
VALUES
  ('cmp10001-0000-0000-0000-000000000001',
   '67697bba-1851-426b-9770-d8bc7dc8c705','facility-demo','family-ahmad-seed',
   'food','جودة وجبات الإفطار',
   'الإفطار يُقدَّم بارداً أحياناً ولا يتناسب مع نظام السكري',
   'resolved','medium','admin-seed','2025-07-15 10:00:00+03',
   'تم التنسيق مع المطبخ لتقديم الوجبات ساخنة وتعديل القائمة لمرضى السكري'),
  ('cmp10002-0000-0000-0000-000000000001',
   '67697bba-1851-426b-9770-d8bc7dc8c705','facility-demo','family-ahmad-seed',
   'communication','تأخر إشعار تعديل الدواء',
   'لم نُبلَّغ عن تعديل جرعة ميتفورمين لمدة يومين',
   'closed','high','admin-seed','2025-08-05 14:00:00+03',
   'تم تحديث بروتوكول الإشعار — الآن يُبلَّغ الولي خلال 24 ساعة من أي تعديل طبي'),
  ('cmp10003-0000-0000-0000-000000000001',
   '09d40b36-81e8-46ce-894b-d330bc9369f4','facility-demo','family-fatimah-seed',
   'care_quality','جدول العلاج الطبيعي',
   'فاطمة فاتتها جلستان من العلاج الطبيعي هذا الشهر دون إشعار',
   'resolved','high','admin-seed','2025-09-10 09:00:00+03',
   'تم مراجعة جدول العلاج الطبيعي وضمان الحجز المسبق للجلسات'),
  ('cmp10004-0000-0000-0000-000000000001',
   '09d40b36-81e8-46ce-894b-d330bc9369f4','facility-demo','family-fatimah-seed',
   'facility','درجة حرارة الغرفة',
   'الغرفة 205 باردة جداً في الليل مما يزعج المقيمة',
   'resolved','low','admin-seed','2025-10-02 11:00:00+03',
   'تم ضبط منظم الحرارة وتزويد المقيمة ببطانية إضافية دافئة'),
  ('cmp10005-0000-0000-0000-000000000001',
   '622e6c8c-5c2b-4423-9216-016378102111','facility-demo','family-omar-seed',
   'care_quality','تأخر جلسات العلاج الطبيعي',
   'يُعتبر العلاج الطبيعي أولوية لعمر لكنه ألغي مرتين هذا الشهر',
   'in_progress','high',NULL,NULL,NULL),
  ('cmp10006-0000-0000-0000-000000000001',
   '622e6c8c-5c2b-4423-9216-016378102111','facility-demo','family-omar-seed',
   'communication','بطء الرد على الاستفسارات',
   'نمرر رسائل للفريق الطبي ويأتي الرد بعد يومين أو ثلاثة',
   'open','medium',NULL,NULL,NULL),
  ('cmp10007-0000-0000-0000-000000000001',
   '67697bba-1851-426b-9770-d8bc7dc8c705','facility-demo','family-ahmad-seed',
   'activity','قلة الأنشطة الترفيهية',
   'نودّ برامج ترفيهية أكثر تنوعاً تناسب اهتمامات أحمد الثقافية',
   'closed','low','admin-seed','2026-01-15 10:00:00+03',
   'تم إضافة ورشة الخط العربي وجلسة التراث الأسبوعية بناءً على هذه الملاحظة'),
  ('cmp10008-0000-0000-0000-000000000001',
   '09d40b36-81e8-46ce-894b-d330bc9369f4','facility-demo','family-fatimah-seed',
   'food','وجبات الحمية القلبية',
   'نطلب وجبات خاصة بمريضة قصور القلب مع تقليل الملح والدهون',
   'resolved','medium','admin-seed','2026-02-01 10:00:00+03',
   'تم إعداد قائمة طعام مخصصة لفاطمة بالتنسيق مع أخصائية التغذية')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- §20  AI MEMORY — ذاكرة الذكاء الاصطناعي الغنية لكل مقيم
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO ai_resident_memory (resident_id, facts, updated_at)
VALUES
  -- ── أحمد الراشد ─────────────────────────────────────────────────────────
  ('67697bba-1851-426b-9770-d8bc7dc8c705', '[
    "أحمد الراشد، 85 عاماً، مقيم في الغرفة 101 منذ يونيو 2025. يعاني من داء السكري النوع الثاني وارتفاع ضغط الدم.",
    "يتناول يومياً: ميتفورمين 500 مجم (مرتين)، أملوديبين 5 مجم، أسبرين 100 مجم. التزام ممتاز بالأدوية — تسجيل تخطي واحد فقط خلال 6 أشهر.",
    "آخر HbA1c: 6.9% (يناير 2026) — تحسن مقارنة بـ 7.1% عند الدخول. نظام الغذائي منخفض السكر يُسهم في التحسن.",
    "ضغط الدم في المعدل عموماً 124-132/78-84. تسجيل 5 ارتفاعات فوق 145 خلال السنة — جميعها استجابت للعلاج.",
    "مرتبط عاطفياً بعائلته: نجله خالد يزوره كل أسبوعين. الزيارات ترفع مزاجه بشكل واضح وملحوظ للطاقم.",
    "يشارك بانتظام في: المشي اليومي في الحديقة (30 دق)، ورشة الخط العربي، جلسة القراءة الأسبوعية.",
    "حساسية موثقة من البنسلين والسلفوناميدات — لا يجوز استخدامها تحت أي ظرف.",
    "سُجِّل 3 ارتفاعات في السكر فوق 165 مرتبطة بالمناسبات الاجتماعية (طعام غير مراقب). يحتاج تنبيهاً قبل المناسبات.",
    "يُفضل الاستيقاظ الساعة 7 صباحاً وشرب القهوة العربية المرة قبل الإفطار — يساعد في التزامه بالدواء الصباحي.",
    "فحص العيون الأخير فبراير 2026: اعتلال شبكية خفيف جداً لا يحتاج تدخلاً — متابعة سنوية.",
    "المزاج إيجابي بشكل عام. تقييم GDS الأخير: 1/15 — لا علامات اكتئاب. يتكيف ممتازاً مع بيئة الرعاية.",
    "شارك في 48 من أصل 52 جلسة نشاط خلال السنة — من أعلى معدلات الحضور في الجناح.",
    "اعتلال الشبكية السكري المبكر: يحتاج فحص عيون كل 6 أشهر وحماية من الضوء القوي.",
    "يُحب مشاركة قصص شبابه مع المتطوعين — هذا يحسّن مزاجه ويُقوّي ذاكرته طويلة الأمد."
  ]'::jsonb, NOW()),

  -- ── فاطمة الزهراني ───────────────────────────────────────────────────────
  ('09d40b36-81e8-46ce-894b-d330bc9369f4', '[
    "فاطمة الزهراني، 90 عاماً، مقيمة في الغرفة 205 منذ يونيو 2025. قصور قلب احتقاني معوّض + تراجع معرفي خفيف + رجفان أذيني متقطع.",
    "أدوية يومية: فيوروسيميد 40 مجم (7 صباحاً)، ليزينوبريل 10 مجم (8 صباحاً)، ريفاستيجمين لصقة 4.6 مجم (9 صباحاً). تغيير موقع اللصقة يومياً.",
    "وزن فاطمة يُقاس أسبوعياً — مؤشر مهم لاحتباس السوائل في قصور القلب. أي زيادة فوق 2 كجم في أسبوع تستدعي تقييم الجرعة.",
    "الكاحلان يُفحصان يومياً للوذمة. سُجِّلت 3 حالات وذمة خفيفة استجابت لرفع القدمين وتعديل مؤقت للفيوروسيميد.",
    "MMSE الأخير: 22/30 (مارس 2026). تراجع معرفي خفيف مستقر — لم يتسارع منذ بدء ريفاستيجمين.",
    "تستجيب بشكل ممتاز للمحفزات التذكارية: الصور القديمة، الموسيقى التراثية، أسماء أقارب الطفولة. هذه الأدوات فعّالة.",
    "حساسية موثقة من NSAIDs (الإيبوبروفين وما شابهه) — ممنوعة تماماً. بديل آمن: الباراسيتامول.",
    "GDS الأخير: 2/15 — تحسن كبير من 6/15 في أول تقييم. برنامج العلاج التذكاري والموسيقى أثّر إيجابياً.",
    "نجلها محمد يزورها مرة كل 3-4 أسابيع من جدة. الزيارة ترفع مزاجها لأيام. تُفيد أنها تنتظر زيارته بشوق.",
    "خطر تسارع القلب بسبب الرجفان الأذيني — 5 حالات خلال السنة. تستجيب للراحة والاسترخاء في معظم الأحيان.",
    "الشهية متذبذبة أحياناً — قد ترفض العشاء. الحديث الهادئ معها يُعيد قبولها للطعام. لا تُجبَر أبداً.",
    "تُحب الجلوس في الحديقة مع نسيم المساء — يُحسّن مزاجها وينظّم نومها الليلي.",
    "أدوية قلبية حساسة الجرعة — أي تغيير يستلزم متابعة BP ووظائف الكلى خلال 48-72 ساعة.",
    "فرّحتها جلسة الموسيقى التراثية — غنّت بصوت واضح وأشرقت عيناها. تُوصى هذه الجلسات بشكل أسبوعي."
  ]'::jsonb, NOW()),

  -- ── عمر الغامدي ──────────────────────────────────────────────────────────
  ('622e6c8c-5c2b-4423-9216-016378102111', '[
    "عمر الغامدي، 83 عاماً، مقيم في الغرفة 312 منذ يوليو 2025. تعافٍ من سكتة دماغية إقفارية مع ضعف الجانب الأيمن وعسر بلع خفيف.",
    "أدوية يومية: كلوبيدوجريل 75 مجم (8 صباحاً)، أتورفاستاتين 40 مجم (22:00)، فيتامين D3 1000 وحدة (الغداء). التزام ممتاز.",
    "تقدم إعادة التأهيل: يوليو 2025 — عاجز عن المشي. سبتمبر 2025 — 5 خطوات بمساعدة كاملة. ديسمبر 2025 — 15 خطوة بمساعدة جزئية. مارس 2026 — 30 خطوة مستقلاً.",
    "ضغط الدم كان مرتفعاً عند الدخول (150-165/90-98). تحسّن تدريجياً — الآن 124-135/78-86. مسار علاجي ناجح.",
    "اليد اليمنى تتحسن: أكتوبر 2025 — تمسك الكوب. ديسمبر 2025 — يكتب اسمه. فبراير 2026 — يُشير باليد اليمنى بوضوح.",
    "البلع آمن الآن للطعام المفروم والطري. بدأ فبراير 2026 تناول الطعام العادي تدريجياً. الشفط لم يُسجَّل منذ 4 أشهر.",
    "الحالة النفسية: أول تقييم GDS = 7/15 (إحباط من بطء التعافي). آخر تقييم = 1/15 — تحوّل مذهل في الروح المعنوية.",
    "ابنته سارة تزوره شهرياً من الدمام. يتحدث عنها كثيراً ويحتفظ بصورتها في غرفته. العلاقة قوية وداعمة.",
    "حساسية جلدية موثقة من الوارفارين — لا يُعطى تحت أي ظرف. البديل كلوبيدوجريل وهو معطاه حالياً.",
    "يشارك في مجموعة دعم المتعافين من السكتة كل أسبوعين — يُساعد الآخرين بقصص تعافيه وهذا يمنحه قوة إضافية.",
    "المتطوع إبراهيم المطيري أثّر كبيراً فيه — جلسات الاستماع والدعم أعطته أملاً خلال الأشهر الأولى الصعبة.",
    "الأهداف الذاتية لعمر: العودة للمشي المستقل، وزيارة ابنته في منزله. هذه الأهداف محرك قوي للالتزام بالتأهيل.",
    "فحص الكوليسترول الأخير: LDL 78 مجم/ديسيلتر — ممتاز مع الأتورفاستاتين. المخاطر القلبية الوعائية تراجعت.",
    "من أكثر المقيمين التزاماً بجلسات العلاج الطبيعي — لم يُلغِ أي جلسة بمبادرته. يستفسر عن مواعيد الجلسات القادمة."
  ]'::jsonb, NOW())
ON CONFLICT (resident_id) DO UPDATE SET
  facts      = EXCLUDED.facts,
  updated_at = NOW();

-- ════════════════════════════════════════════════════════════════════════════
-- §21  VITAL ALERTS — تنبيهات لأبرز القراءات الشاذة
-- ════════════════════════════════════════════════════════════════════════════
DO $valt$ BEGIN
  IF (SELECT COUNT(*) FROM vital_alerts
      WHERE facility_id='facility-demo'
        AND created_at >= '2025-06-01') < 5 THEN

    INSERT INTO vital_alerts (id, vital_sign_id, resident_id, facility_id,
      vital_type, recorded_value, threshold_min, threshold_max, severity, status)
    SELECT
      gen_random_uuid(),
      vs.id,
      vs.resident_id,
      'facility-demo',
      CASE
        WHEN vs.heart_rate > 100 THEN 'heart_rate'
        WHEN vs.blood_pressure_systolic > 140 THEN 'blood_pressure_systolic'
        WHEN vs.oxygen_saturation < 95 THEN 'oxygen_saturation'
        ELSE 'blood_glucose'
      END,
      CASE
        WHEN vs.heart_rate > 100 THEN vs.heart_rate::numeric
        WHEN vs.blood_pressure_systolic > 140 THEN vs.blood_pressure_systolic::numeric
        WHEN vs.oxygen_saturation < 95 THEN vs.oxygen_saturation::numeric
        ELSE vs.blood_glucose::numeric
      END,
      CASE
        WHEN vs.heart_rate > 100 THEN 60
        WHEN vs.blood_pressure_systolic > 140 THEN 90
        WHEN vs.oxygen_saturation < 95 THEN 95
        ELSE 70
      END,
      CASE
        WHEN vs.heart_rate > 100 THEN 100
        WHEN vs.blood_pressure_systolic > 140 THEN 140
        WHEN vs.oxygen_saturation < 95 THEN NULL
        ELSE 140
      END,
      CASE
        WHEN vs.heart_rate > 110 OR vs.blood_pressure_systolic > 155 OR vs.oxygen_saturation < 92 THEN 'critical'
        ELSE 'warning'
      END,
      'resolved'
    FROM vital_signs vs
    WHERE vs.facility_id = 'facility-demo'
      AND vs.recorded_at >= '2025-06-01'
      AND (
        vs.heart_rate > 100
        OR vs.blood_pressure_systolic > 140
        OR (vs.oxygen_saturation IS NOT NULL AND vs.oxygen_saturation < 95)
        OR (vs.blood_glucose IS NOT NULL AND vs.blood_glucose > 160)
      )
    LIMIT 30;

  END IF;
END $valt$;

-- ════════════════════════════════════════════════════════════════════════════
-- §22  INVENTORY — مستودع المستلزمات الطبية
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO inventory_items (id, facility_id, name, category, current_stock, min_required, unit)
VALUES
  ('inv10001-0000-0000-0000-000000000001','facility-demo','قفازات طبية (M)','مستلزمات',200,50,'علبة'),
  ('inv10002-0000-0000-0000-000000000001','facility-demo','أسبرين 100 مجم','أدوية',45,20,'شريط'),
  ('inv10003-0000-0000-0000-000000000001','facility-demo','ميتفورمين 500 مجم','أدوية',60,20,'شريط'),
  ('inv10004-0000-0000-0000-000000000001','facility-demo','حفاضات للبالغين (L)','شخصية',5,25,'عبوة'),
  ('inv10005-0000-0000-0000-000000000001','facility-demo','معقّم اليدين 500 مل','مستلزمات',12,10,'زجاجة'),
  ('inv10006-0000-0000-0000-000000000001','facility-demo','لصقة ريفاستيجمين 4.6 مجم','أدوية',15,5,'علبة'),
  ('inv10007-0000-0000-0000-000000000001','facility-demo','جهاز قياس الضغط الرقمي','أجهزة',3,2,'جهاز'),
  ('inv10008-0000-0000-0000-000000000001','facility-demo','قياس سكر الدم (شرائح)','مستلزمات',80,30,'علبة'),
  ('inv10009-0000-0000-0000-000000000001','facility-demo','مرهم وقاية من قرح الفراش','مستلزمات',8,5,'أنبوب'),
  ('inv10010-0000-0000-0000-000000000001','facility-demo','كمادات دافئة قابلة للإعادة','مستلزمات',6,4,'قطعة')
ON CONFLICT (id) DO NOTHING;

COMMIT;
