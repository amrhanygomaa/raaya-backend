# Raaya Backend — Remaining Work (AI-Optimized Spec)

> **Last verified:** 2026-05-24 by full endpoint diff between Flutter frontend (`Tbtba-main`) and NestJS backend (`raaya-backend-clone`).
> **Integration status (code-level):** ~99% — All P1–P11 implemented in this session.
> **Audience:** AI coding agents and human developers continuing the work.

## 🟢 Status snapshot (2026-05-24, end of session)

| Priority | Module | Status | Migration | Notes |
|---|---|---|---|---|
| P1 | Video Calls (new) | ✅ Done | 031 | 4 endpoints |
| P2 | User Progress (new) | ✅ Done | 032 | 2 endpoints |
| P3 | User Preferences (new) | ✅ Done | 033 | 2 endpoints |
| P4 | AI Media (in `ai/`) | ✅ Done | 034 | 2 endpoints (S3 presigned) |
| P5 | Facilities + Inquiries (new, PUBLIC) | ✅ Done | 035 | 2 endpoints |
| P6 | Admin user details + reviews | ✅ Done | 036 | 2 endpoints |
| P7 | Staff photo upload | ✅ Done | 037 | 2 endpoints (S3 presigned) |
| P8 | Facility settings extras | ✅ Done | 038 | 6 endpoints (emergency / billing / profile, GET+PUT each — discovered 2 extra during impl) |
| P9 | Social assessment-tool questions | ✅ Done | 039 | 1 endpoint (links tool→scale) |
| P10 | Resident audit trail | ✅ Done | 040 | 1 endpoint (table ready, **backfill writes from POST/PATCH /residents still TODO**) |
| P11 | Volunteer public link | ✅ Done | 041 | 1 endpoint (uses env `VOLUNTEER_PUBLIC_BASE_URL`, `VOLUNTEER_PUBLIC_LINK_TTL_DAYS`) |

**Total:** 26 new endpoints, 11 new migrations, 5 new modules, 6 modules extended. `tsc --noEmit` passes clean.

## ⏭ Before deploy

1. Run migrations 031 → 041 against the target DB in order.
2. Set new env vars in deployment:
   - `S3_MEDIA_PUBLIC_BASE_URL` (optional, used by P4 + P7 to compute final mediaUrl)
   - `VOLUNTEER_PUBLIC_BASE_URL` (default `https://app.helpers-tech.com/v`)
   - `VOLUNTEER_PUBLIC_LINK_TTL_DAYS` (default `30`)
3. Smoke-test via Swagger at `/api/docs` for each new tag: Video Calls, User Progress, User Preferences, AI Media, Facilities (Public), Admin Management, Social, Residents, Volunteers.
4. Verify frontend services no longer return 404 (see section 4 below).

## 🪜 Follow-ups (not blocking)

- **P10 audit writes:** existing `POST /residents`, `PATCH /residents/:id`, `PUT /residents/:id/medical-info` do **not** insert into `resident_audit_log` yet. Add `INSERT INTO resident_audit_log ...` calls in those service paths so the audit trail starts populating.
- **`/volunteers/documents/upload` + `/volunteers/documents/:id/confirm`:** discovered during P11 verification. Frontend ([`lib/services/volunteer_documents_service.dart`](../Tbtba-main%20(1)/Tbtba-main/lib/services/volunteer_documents_service.dart)) calls these to upload CVs. Same S3 presigned pattern as P4 / P7. Add as a future P12.
- **Frontend hardcoded fallbacks:** after P8 + P9 are deployed and verified, remove the hardcoded `emergencyContacts` / `gdsQuestions` / `questionBank` fallbacks from the Flutter side.

---

## 0. Context for AI agents

You are continuing work on the **Raaya Backend** that powers the Flutter app **Taptaba (طبطبة)** — an elderly care home management system with 6 roles (Elderly, Nurse, Social Specialist, Family, Volunteer, Admin).

- **Backend repo (this repo):** `C:\Users\amrha\Downloads\raaya-backend-clone\` — NestJS 11 + TypeScript 5.7
- **Frontend repo:** `c:\Users\amrha\Downloads\Tbtba-main (1)\Tbtba-main\` — Flutter + Riverpod
- **Production URL:** `https://api.helpers-tech.com`
- **Swagger:** `/api/docs`
- **Auth:** AWS Cognito (JWT in `Authorization: Bearer` header). Most endpoints use `@UseGuards(AuthGuard('jwt'))`. Admin-only routes also use `@Roles('Admin')`.
- **DB:** PostgreSQL on AWS RDS, accessed via raw `pg` driver (no ORM). Migrations in `migrations/` folder, numbered sequentially.
- **Multi-tenancy:** Every row scoped by `facilityId` from `req.user.facilityId` (JWT claim `custom:facilityId`).

### Code conventions (must follow)

1. **Controllers** live under `src/<module>/<module>.controller.ts`.
2. Use NestJS decorators: `@ApiTags`, `@ApiOperation`, `@ApiBody`, `@ApiResponse`, `@UseGuards(AuthGuard('jwt'))`.
3. Inject `req.user.facilityId` for tenant scoping. Never trust body-supplied facilityId.
4. SQL via raw `pg` — see `src/database/database.service.ts` for the pattern. Use parameterized queries (`$1`, `$2`).
5. Migrations: add a new file under `migrations/` with the next sequential prefix (e.g. `028_video_calls.sql`). Idempotent (use `CREATE TABLE IF NOT EXISTS`).
6. Register every new module in `src/app.module.ts`.
7. **Do NOT** use TypeORM, Prisma, or any ORM. Stay with raw `pg`.
8. Camel-case JSON response keys (e.g. `residentId`, not `resident_id`). Frontend accepts both but new code should use camelCase.

### Definition of done for each endpoint

- [ ] Controller method with `@Api*` decorators
- [ ] Service method with SQL
- [ ] Migration file if a new table is needed
- [ ] Module registered in `app.module.ts`
- [ ] Verified via Swagger UI locally
- [ ] Frontend call succeeds (no 404)

---

## 1. Missing endpoints — implementation order

Implement in this order. Each section is self-contained.

---

### 🔴 P1 — Video Calls (new module)

**Why first:** Entire feature broken. Used by 4 roles (Family, Nurse, Specialist, Elderly).

**Frontend client:** [`lib/services/video_call_service.dart`](../Tbtba-main%20(1)/Tbtba-main/lib/services/video_call_service.dart)

**Module to create:** `src/video-calls/` (controller + service + module)

**Endpoints:**

| Method | Route | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/video-calls` | JWT | `{ residentId?, calleeId?, calleeName?, callType, provider='zoom', joinUrl? }` | `VideoCall` |
| GET | `/video-calls/active` | JWT | — | `VideoCall[]` (where status IN `'ringing','active'` AND facilityId match) |
| PATCH | `/video-calls/:id/status` | JWT | `{ status }` (one of: ringing, active, ended, missed, declined) | `VideoCall` |
| GET | `/video-calls/history` | JWT | query: `userId?` | `VideoCall[]` ordered by `startedAt DESC` |

**`VideoCall` shape (camelCase):**
```ts
{
  id: string (uuid)
  residentId: string | null
  callerId: string         // from req.user.userId
  calleeId: string | null
  calleeName: string | null
  provider: 'zoom' | 'agora' | 'jitsi'
  joinUrl: string | null
  callType: 'family_video' | 'medical_consult' | 'volunteer_visit'
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined'
  startedAt: ISO8601 string
  endedAt: ISO8601 string | null
  facilityId: string
}
```

**Migration:** `migrations/031_video_calls.sql`
```sql
CREATE TABLE IF NOT EXISTS video_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id TEXT NOT NULL,
  resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
  caller_id TEXT NOT NULL,
  callee_id TEXT,
  callee_name TEXT,
  provider TEXT NOT NULL DEFAULT 'zoom',
  join_url TEXT,
  call_type TEXT NOT NULL DEFAULT 'family_video',
  status TEXT NOT NULL DEFAULT 'ringing',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_calls_facility ON video_calls(facility_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_status ON video_calls(facility_id, status);
CREATE INDEX IF NOT EXISTS idx_video_calls_started ON video_calls(facility_id, started_at DESC);
```

---

### 🔴 P2 — User Progress / Gamification (new module)

**Why:** Drives points/streak UI in elderly + volunteer dashboards.

**Frontend client:** [`lib/services/user_progress_service.dart`](../Tbtba-main%20(1)/Tbtba-main/lib/services/user_progress_service.dart)

**Module to create:** `src/user-progress/`

**Endpoints:**

| Method | Route | Body | Response |
|---|---|---|---|
| GET | `/user-progress/me` | — | `UserProgress` for `req.user.userId` (auto-create with zeros if missing) |
| POST | `/user-progress/points` | `{ points, completedActivitiesDelta=1, streakDays? }` | updated `UserProgress` |

**`UserProgress` shape:**
```ts
{
  id: string (uuid)
  userId: string           // = req.user.userId
  points: number           // total accumulated
  streakDays: number       // consecutive active days
  completedActivities: number
  lastActivityAt: ISO8601 | null
}
```

**Behavior on POST:** Increment `points += body.points`, `completedActivities += body.completedActivitiesDelta`, update `streakDays` if provided, set `lastActivityAt = NOW()`. Upsert by userId.

**Migration:** `migrations/032_user_progress.sql`
```sql
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  facility_id TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  completed_activities INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 🔴 P3 — User Preferences (new module)

**Why:** Frontend stores per-user prefs (language, notification toggles, theme). Currently fails silently.

**Frontend client:** [`lib/services/user_preferences_service.dart`](../Tbtba-main%20(1)/Tbtba-main/lib/services/user_preferences_service.dart)

**Module to create:** `src/user-preferences/`

**Endpoints:**

| Method | Route | Body | Response |
|---|---|---|---|
| GET | `/user-preferences/me` | — | `{ preferences: object }` (empty `{}` if missing) |
| PUT | `/user-preferences/me` | `{ preferences: object }` | `{ preferences: object }` |

**Storage:** Single JSONB column. No schema enforcement — frontend owns the shape.

**Migration:** `migrations/033_user_preferences.sql`
```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 🔴 P4 — AI Media Upload (extend existing `ai` module)

**Why:** Family/Specialist upload images for AI analysis (medication labels, wounds, documents). Currently fails on first call.

**Frontend client:** [`lib/services/ai_media_service.dart`](../Tbtba-main%20(1)/Tbtba-main/lib/services/ai_media_service.dart)

**Add to:** `src/ai/ai.controller.ts`

**Endpoints:**

| Method | Route | Body | Response |
|---|---|---|---|
| POST | `/ai/media/upload` | `{ fileName, contentType, residentId? }` | `{ id, fileName, contentType, status='pending', uploadUrl, s3Key }` |
| PATCH | `/ai/media/:id/confirm` | `{ notes? }` | `{ id, fileName, contentType, status='confirmed', mediaUrl }` |

**Flow (mirrors existing `/family-bridge/media/upload` pattern):**
1. POST returns presigned S3 PUT URL.
2. Client uploads bytes directly to S3.
3. PATCH confirms and returns public mediaUrl.

**Implementation hint:** Copy structure from `src/family-bridge/family-bridge.controller.ts` `@Post('media/upload')` and `@Patch('media/:id/confirm')`. Same S3 helper, different DB table.

**Migration:** `migrations/034_ai_media.sql`
```sql
CREATE TABLE IF NOT EXISTS ai_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  media_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);
```

---

### 🔴 P5 — Facilities Search & Inquiries (new module, PUBLIC)

**Why:** Used by login screen BEFORE auth — family/volunteer browse facilities and submit inquiries. Both routes must be public (no `@UseGuards`).

**Frontend client:** [`lib/services/facility_inquiry_service.dart`](../Tbtba-main%20(1)/Tbtba-main/lib/services/facility_inquiry_service.dart)

**Module to create:** `src/facilities/`

**Endpoints:**

| Method | Route | Auth | Query / Body | Response |
|---|---|---|---|---|
| GET | `/facilities/search` | **PUBLIC** | query: `governorate, city, features=a,b,c` | `{ facilityId, facilityName }[]` |
| POST | `/facility-inquiries` | **PUBLIC** | `{ name, phone, governorate, city, features: string[], facilityId? }` | `{ id, status: 'received' }` |

**Spam protection:** Rate-limit `/facility-inquiries` by IP (e.g. 5/hour). Use `@nestjs/throttler` if not already installed.

**Migrations:** `migrations/035_facilities.sql`
```sql
CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  governorate TEXT NOT NULL,
  city TEXT NOT NULL,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facility_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  governorate TEXT NOT NULL,
  city TEXT NOT NULL,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'received',
  source_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Search logic:** Match `governorate` (exact), `city` (ILIKE), and feature overlap (`features && $3::text[]`). If `features=[]`, skip feature filter.

---

### 🟠 P6 — Admin User Details + Reviews (extend `admin-management`)

**Frontend client:** [`lib/services/admin_users_service.dart`](../Tbtba-main%20(1)/Tbtba-main/lib/services/admin_users_service.dart)

**Add to:** `src/admin-management/admin-management.controller.ts`

| Method | Route | Response |
|---|---|---|
| GET | `/admin/users/:id` | `ManagedStaffDetails { id, email, fullName, role, status }` |
| GET | `/admin/users/:id/reviews` | `StaffReview[] { id, fromName, fromRole, rating, comment, createdAt }` |

**Reviews source:** Read from `volunteer_reviews` if role=Volunteer; otherwise from a new `staff_reviews` table.

**Migration:** `migrations/036_staff_reviews.sql`
```sql
CREATE TABLE IF NOT EXISTS staff_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,         -- managed_users.id
  from_user_id TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_role TEXT NOT NULL,
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_reviews_staff ON staff_reviews(facility_id, staff_id);
```

---

### 🟠 P7 — Staff Photo Upload (extend `admin-management`)

**Frontend client:** [`lib/services/profile_image_service.dart`](../Tbtba-main%20(1)/Tbtba-main/lib/services/profile_image_service.dart)

**Add to:** `src/admin-management/admin-management.controller.ts`

| Method | Route | Body | Response |
|---|---|---|---|
| POST | `/admin/users/:id/photo/upload` | `{ fileName, contentType }` | `{ s3Key, presignedUrl }` |
| PATCH | `/admin/users/:id/photo/confirm` | `{ s3Key }` | `{ imageUrl }` |

**Storage:** Add `image_url` column to `managed_users` table.

**Migration:** `migrations/037_managed_users_photo.sql`
```sql
ALTER TABLE managed_users ADD COLUMN IF NOT EXISTS image_url TEXT;
```

**S3 key pattern:** `facilities/{facilityId}/users/{userId}/profile/{uuid}.{ext}`

---

### 🟠 P8 — Facility Emergency Contacts (extend `admin-management`)

**Frontend client:** [`lib/services/facility_settings_service.dart:139`](../Tbtba-main%20(1)/Tbtba-main/lib/services/facility_settings_service.dart)

**Add to:** `src/admin-management/admin-management.controller.ts`

| Method | Route | Response |
|---|---|---|
| GET | `/admin/settings/emergency-contacts` | `EmergencyContact[] { id, label, phone, priority }` |
| PUT | `/admin/settings/emergency-contacts` | `EmergencyContact[]` (replace all) |

**Storage option A (simple):** Reuse `facility_settings.value JSONB` with key `emergency_contacts`.
**Storage option B (relational):** New table.

**Pick A** unless ordering/priority queries are needed.

---

### 🟠 P9 — Social Assessment Tool Questions (extend `social`)

**Frontend client:** [`lib/services/social_service.dart:232`](../Tbtba-main%20(1)/Tbtba-main/lib/services/social_service.dart)

**Add to:** `src/social/social.controller.ts`

| Method | Route | Response |
|---|---|---|
| GET | `/social/assessment-tools/:toolId/questions` | `Question[] { id, text, weight, options: { value, label }[] }` |

**Storage:** New table `assessment_tool_questions` linked to existing `assessment_tools`. Seed with GDS-15 and MMSE question banks.

**Migration:** `migrations/038_assessment_tool_questions.sql` *(note: existing `030_create_assessment_questions.sql` covers GDS via `scale` column — P9 may just need an endpoint mapping `toolId` → `scale`)*
```sql
CREATE TABLE IF NOT EXISTS assessment_tool_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES assessment_tools(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_atq_tool ON assessment_tool_questions(tool_id, position);
```

---

### 🟠 P10 — Resident Audit Trail (extend `residents`)

**Frontend client:** [`lib/providers/app_riverpod.dart:976`](../Tbtba-main%20(1)/Tbtba-main/lib/providers/app_riverpod.dart)

**Add to:** `src/residents/residents.controller.ts`

| Method | Route | Response |
|---|---|---|
| GET | `/residents/:id/audit-trail` | `AuditEntry[] { id, action, actorName, actorRole, changedFields, at }` |

**Source:** Either a new `resident_audit_log` table (write from all resident mutation endpoints) OR query existing audit infrastructure if present.

**Migration:** `migrations/039_resident_audit_log.sql`
```sql
CREATE TABLE IF NOT EXISTS resident_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id TEXT NOT NULL,
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,          -- 'created' | 'updated' | 'medical_info_updated' | ...
  changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rau_resident ON resident_audit_log(resident_id, at DESC);
```

**Follow-up:** Insert audit rows from existing `POST /residents`, `PATCH /residents/:id`, `PUT /residents/:id/medical-info`.

---

### 🟠 P11 — Volunteer Public Link (extend `volunteers`)

**Frontend client:** [`lib/services/volunteer_documents_service.dart:93`](../Tbtba-main%20(1)/Tbtba-main/lib/services/volunteer_documents_service.dart)

**Add to:** `src/volunteers/volunteers.controller.ts`

| Method | Route | Body | Response |
|---|---|---|---|
| POST | `/volunteers/profile/public-link` | — | `{ publicUrl, expiresAt }` |

**Logic:** Generate a signed token (JWT or random hex), store in `volunteer_profiles.public_token` with expiry. Construct URL as `${PUBLIC_PROFILE_BASE_URL}/v/${token}`.

**Optional public reader:** `GET /v/:token` returning sanitized volunteer profile. Mark scope for later.

---

## 2. Known backend warnings (fix separately)

These are NOT new endpoints but existing issues:

1. **AI memory is in-memory** — [`src/ai/ai.controller.ts:201`](src/ai/ai.controller.ts) stores chat history in a `Map`. Lost on restart. Move to PostgreSQL table `ai_conversation_memory`.
2. **No WebSocket/SSE** — Live updates use polling + FCM only. Consider Socket.IO gateway under `src/gateway/`.
3. **Demo URL is HTTP only** — `http://13.219.217.9:3000` should redirect to HTTPS or be retired.
4. **Frontend has 3 hardcoded fallbacks** still active even after P8/P9: `gdsQuestions`, `questionBank`, `emergencyContacts`. After P8 + P9 land, remove fallbacks from frontend.

---

## 3. Implementation checklist (per endpoint)

```
[ ] 1. Create migration file under migrations/ (next sequential number)
[ ] 2. Run migration locally against dev DB
[ ] 3. Create / extend module under src/<module>/
[ ] 4. Add Controller method with @Api* decorators + @UseGuards(AuthGuard('jwt'))
[ ] 5. Add Service method with parameterized SQL
[ ] 6. Register module in src/app.module.ts (only if new module)
[ ] 7. Test via Swagger UI at /api/docs
[ ] 8. Verify frontend service call no longer returns 404
[ ] 9. Update this file: mark endpoint as ✅ done in section 1
```

---

## 4. Frontend services that should work after this is done

After P1–P11 ship, these frontend services will be fully functional (no 404s):

- `video_call_service.dart` (P1)
- `user_progress_service.dart` (P2)
- `user_preferences_service.dart` (P3)
- `ai_media_service.dart` (P4)
- `facility_inquiry_service.dart` (P5)
- `admin_users_service.dart` (P6)
- `profile_image_service.dart` (P7)
- `facility_settings_service.dart` emergency contacts path (P8)
- `social_service.dart` questions path (P9)
- `app_riverpod.dart` audit trail call (P10)
- `volunteer_documents_service.dart` public link (P11)

Estimated integration after P1–P5 ships: **~92%**. After P6–P11: **~99%**.

---

## 5. Reference: Existing controllers (do not modify shape without coordination)

`auth`, `admin` (admin-management), `ai`, `activities`, `app`, `billing`, `care-tasks`, `complaints`, `doctor-visits`, `emergency`, `family-bridge`, `family-members`, `handoffs`, `health`, `inventory`, `jobs`, `kpi`, `meal-plans`, `medical-sessions`, `medications`, `memories`, `messages`, `notifications`, `nursing-notes`, `prescriptions`, `reports`, `residents`, `social`, `users`, `voice-messages`, `volunteers` — **31 total**
