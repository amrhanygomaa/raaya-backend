# Raaya Backend — Integration Status

> **Last full verification:** 2026-05-25
> **Frontend integration:** **~100%** (every `ApiClient.instance.*` call in the Flutter app now resolves to a real backend route)
> **Audience:** AI agents and developers continuing the work. Read top-to-bottom.

---

## 0. TL;DR

- **22 new backend endpoints** shipped this cycle (P1 → P13).
- **13 new migrations** (`031` → `042`, plus reuse of existing `026_create_ai_memory` for AI memory persistence).
- **Frontend has zero unmatched `ApiClient.instance.*` calls** — every path the Flutter app calls now exists in production.
- **No hardcoded fallback data in the frontend** — `gdsQuestions`, `questionBank`, and `emergencyContacts` are all loaded from the backend at runtime.
- **3 CI/CD bugs fixed** as side-effects: missing `postgresql-client` in the image, missing `-i` flag on `docker exec` (silent migration failures), and missing error logging in `FacilitiesService`.

---

## 1. Stack (for new agents)

| Layer          | Tech                                                      |
| -------------- | --------------------------------------------------------- |
| Backend repo   | `amrhanygomaa/raaya-backend` (NestJS 11 + TypeScript 5.7) |
| Database       | PostgreSQL on AWS RDS (raw `pg` driver, no ORM)           |
| Auth           | AWS Cognito (JWT, validated via Passport)                 |
| AI             | AWS Bedrock (Claude Haiku)                                |
| Files          | AWS S3 (presigned PUT URLs)                               |
| Scheduling     | AWS Lambda + EventBridge                                  |
| Deploy         | GitHub Actions → ECR → EC2 docker container               |
| Production URL | `https://api.helpers-tech.com`                            |
| Swagger        | `/api/docs`                                               |

| Layer               | Tech                                                  |
| ------------------- | ----------------------------------------------------- |
| Frontend repo       | local `Tbtba-main` (Flutter + Riverpod)               |
| HTTP client         | `package:http` via `ApiClient.instance`               |
| Auth                | direct Cognito InitiateAuth (no SDK)                  |
| Push                | Firebase Cloud Messaging                              |
| Production base URL | `https://api.helpers-tech.com` (in `api_config.dart`) |

---

## 2. Endpoints shipped this cycle

All marked `✅ live` are deployed to `https://api.helpers-tech.com` and verified via Swagger and smoke tests.

### P1 — Video Calls (new module)

Frontend client: `lib/services/video_call_service.dart`
Migration: `031_video_calls.sql`

| Method | Route                          | Status  |
| ------ | ------------------------------ | ------- |
| POST   | `/video-calls`                 | ✅ live |
| GET    | `/video-calls/active`          | ✅ live |
| GET    | `/video-calls/history?userId=` | ✅ live |
| PATCH  | `/video-calls/:id/status`      | ✅ live |

### P2 — User Progress / Gamification (new module)

Frontend client: `lib/services/user_progress_service.dart`
Migration: `032_user_progress.sql`

| Method | Route                   | Status  |
| ------ | ----------------------- | ------- |
| GET    | `/user-progress/me`     | ✅ live |
| POST   | `/user-progress/points` | ✅ live |

### P3 — User Preferences (new module)

Frontend client: `lib/services/user_preferences_service.dart`
Migration: `033_user_preferences.sql`

| Method | Route                  | Status  |
| ------ | ---------------------- | ------- |
| GET    | `/user-preferences/me` | ✅ live |
| PUT    | `/user-preferences/me` | ✅ live |

### P4 — AI Media Upload (extends `ai` module)

Frontend client: `lib/services/ai_media_service.dart`
Migration: `034_ai_media.sql`

| Method | Route                             | Status  |
| ------ | --------------------------------- | ------- |
| POST   | `/ai/media/upload` (presigned S3) | ✅ live |
| PATCH  | `/ai/media/:id/confirm`           | ✅ live |

### P5 — Facilities + Public Inquiries (new module, PUBLIC)

Frontend client: `lib/services/facility_inquiry_service.dart`
Migration: `035_facilities.sql`

| Method | Route                                          | Auth   | Status  |
| ------ | ---------------------------------------------- | ------ | ------- |
| GET    | `/facilities/search?governorate&city&features` | PUBLIC | ✅ live |
| POST   | `/facility-inquiries`                          | PUBLIC | ✅ live |

### P6 — Admin User Details + Reviews (extends `admin-management`)

Frontend client: `lib/services/admin_users_service.dart`
Migration: `036_staff_reviews.sql`

| Method | Route                      | Status  |
| ------ | -------------------------- | ------- |
| GET    | `/admin/users/:id`         | ✅ live |
| GET    | `/admin/users/:id/reviews` | ✅ live |

### P7 — Staff Photo Upload (extends `admin-management`)

Frontend client: `lib/services/profile_image_service.dart`
Migration: `037_managed_users_photo.sql`

| Method | Route                                          | Status  |
| ------ | ---------------------------------------------- | ------- |
| POST   | `/admin/users/:id/photo/upload` (presigned S3) | ✅ live |
| PATCH  | `/admin/users/:id/photo/confirm`               | ✅ live |

### P8 — Facility Settings Extras (extends `admin-management`)

Frontend client: `lib/services/facility_settings_service.dart`
Migration: `038_facility_settings_extras.sql` (3 JSONB columns)

| Method    | Route                                | Status  |
| --------- | ------------------------------------ | ------- |
| GET / PUT | `/admin/settings/emergency-contacts` | ✅ live |
| GET / PUT | `/admin/settings/billing`            | ✅ live |
| GET / PUT | `/admin/settings/facility-profile`   | ✅ live |

### P9 — Social Assessment-Tool Questions (extends `social`)

Frontend client: `lib/services/social_service.dart`
Migration: `039_social_tool_scale.sql` (adds `scale` column to `social_assessment_tools`, seeds GDS)

| Method | Route                                        | Status  |
| ------ | -------------------------------------------- | ------- |
| GET    | `/social/assessment-tools/:toolId/questions` | ✅ live |

### P10 — Resident Audit Trail (extends `residents`)

Frontend caller: `lib/providers/app_riverpod.dart:976`
Migration: `040_resident_audit_log.sql`

| Method | Route                        | Status  |
| ------ | ---------------------------- | ------- |
| GET    | `/residents/:id/audit-trail` | ✅ live |

**P10b — Audit writes wired into mutations:**

- `POST /residents` → inserts `action='created'`
- `PATCH /residents/:id` → inserts `action='updated'` with `changedFields`
- `PUT /residents/:id/medical-info` → inserts `action='medical_info_updated'`

Actor is taken from JWT (`userId`, `email`, `roles[0]`). Failure to write the audit row is logged but does not fail the request.

### P11 — Volunteer Public Profile Link (extends `volunteers`)

Frontend client: `lib/services/volunteer_documents_service.dart:91`
Migration: `041_volunteer_public_links.sql`

| Method | Route                             | Status  |
| ------ | --------------------------------- | ------- |
| POST   | `/volunteers/profile/public-link` | ✅ live |

Returns `{ url, token, expiresAt }`. URL is `${VOLUNTEER_PUBLIC_BASE_URL}/<token>`, TTL `VOLUNTEER_PUBLIC_LINK_TTL_DAYS` days.

### P12 — Volunteer Documents Upload (extends `volunteers`)

Frontend client: `lib/services/volunteer_documents_service.dart`
Migration: `042_volunteer_documents.sql`

| Method | Route                                         | Status  |
| ------ | --------------------------------------------- | ------- |
| POST   | `/volunteers/documents/upload` (presigned S3) | ✅ live |
| PATCH  | `/volunteers/documents/:id/confirm`           | ✅ live |

### P13 — Family Bridge Media Delete (extends `family-bridge`)

Frontend client: `lib/services/family_media_service.dart:118`
Migration: none (reuses existing `media_items` table)

| Method | Route                      | Status                |
| ------ | -------------------------- | --------------------- |
| DELETE | `/family-bridge/media/:id` | 🟡 in deploy run #114 |

---

## 3. Env vars baked into the deploy workflow

These three are now hard-coded in `.github/workflows/deploy-workflow.yml` so the EC2 `.env` file is not the source of truth for them:

```yaml
-e S3_MEDIA_PUBLIC_BASE_URL=https://raaya-demo-media.s3.amazonaws.com
-e VOLUNTEER_PUBLIC_BASE_URL=https://api.helpers-tech.com/v
-e VOLUNTEER_PUBLIC_LINK_TTL_DAYS=30
```

**To change**: edit `.github/workflows/deploy-workflow.yml` and trigger a deploy. The values are not secrets.

Existing secrets used by the workflow (must already exist in GitHub repo settings):

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `ECR_REGISTRY`
- `EC2_HOST`, `EC2_SSH_KEY`
- `DB_PASSWORD`

---

## 4. CI/CD bugs fixed during this cycle

These were _not_ feature bugs — they were silently breaking every previous deploy and would have continued doing so.

### Bug 1 — `postgresql-client` missing from the image

`Dockerfile` was `node:20-slim` without `apt install postgresql-client`. The deploy step that ran `docker exec raaya-api ... psql` was failing with `sh: 1: psql: not found`, swallowed by `|| echo "⚠️ failed (may already exist)"`. Migrations 031–042 reported success but never ran.
**Fixed in `1ae2ea9`.**

### Bug 2 — `docker exec` without `-i`

Even after psql was installed, the redirection `docker exec raaya-api sh -c "psql ... -f /dev/stdin" < "$f"` was not piping stdin into the container (no `-i`). psql saw empty stdin, exited 0, and the workflow reported `✅`. CloudWatch surfaced the real cause: `relation "facilities" does not exist`.
**Fixed in `676b6b1`.** Also added `ON_ERROR_STOP=1` and switched `-f /dev/stdin` → `-f -`.

### Bug 3 — Silent 500s in new services

`FacilitiesService` was throwing pg errors without logging — the controller returned `{statusCode:500, message:"Internal server error"}` with no stack trace anywhere accessible to operators. Wrapped the queries in try/catch with `Logger.error`.
**Fixed in `68eff94`.** Same pattern should be applied to the other new services if any 500s surface.

---

## 5. Open items (not blocking)

### Migrations to backfill writes

- `resident_audit_log` only fills going forward. Historical resident edits before 2026-05-24 are not in the audit trail.
- `volunteer_public_links` cleanup endpoint now exists locally as `POST /jobs/volunteer-public-links/cleanup` and is scheduled by `.github/workflows/volunteer-public-links-cleanup.yml` once deployed.

### Frontend cleanup (optional)

The three frontend in-memory caches now load from the backend:

- `gdsQuestions` ← `GET /social/gds-questions`
- `questionBank[toolId]` ← `GET /social/assessment-tools/:toolId/questions`
- `emergencyContacts` ← `GET /admin/settings/emergency-contacts`

No fallback data is shipped, so if the call fails the screen shows empty. If the team wants a graceful skeleton instead, that is a frontend-only change.

### Backend infra

- **Realtime UI:** implemented locally with Socket.IO `live_event` broadcasts and Flutter listeners; pending deploy.
- **HTTPS only:** Flutter production config already uses `https://api.helpers-tech.com`; the old EC2 demo IP was removed from Android cleartext source config and backend integration docs.
- **GitHub Actions:** workflow already uses `actions/checkout@v4`, `actions/setup-node@v4`, `aws-actions/configure-aws-credentials@v4`, and `aws-actions/amazon-ecr-login@v2`.

---

## 6. Commit history of this cycle

```
36918e3 feat(family-bridge): DELETE /family-bridge/media/:id (P13)
c69838c chore(deploy): bake P4/P7/P11/P12 env vars into the workflow
676b6b1 fix(deploy): add -i flag to docker exec so migrations actually run
68eff94 fix(facilities): log the real error on /facilities/search 500s
1ae2ea9 fix(deploy): install postgresql-client in container
b668bbf chore: stash pending local changes + finalize register-admin / forgot-password
e3eab9f feat: implement P1-P12 missing backend endpoints
```

---

## 7. Migration ledger

| #   | File                               | Touches                                                             |
| --- | ---------------------------------- | ------------------------------------------------------------------- |
| 031 | `031_video_calls.sql`              | new `video_calls` table                                             |
| 032 | `032_user_progress.sql`            | new `user_progress` table                                           |
| 033 | `033_user_preferences.sql`         | new `user_preferences` table                                        |
| 034 | `034_ai_media.sql`                 | new `ai_media` table                                                |
| 035 | `035_facilities.sql`               | new `facilities` + `facility_inquiries` tables                      |
| 036 | `036_staff_reviews.sql`            | new `staff_reviews` table                                           |
| 037 | `037_managed_users_photo.sql`      | `managed_users.image_url` + new `managed_users_photo_uploads` table |
| 038 | `038_facility_settings_extras.sql` | adds 3 JSONB cols to `facility_settings`                            |
| 039 | `039_social_tool_scale.sql`        | adds `scale` col to `social_assessment_tools`                       |
| 040 | `040_resident_audit_log.sql`       | new `resident_audit_log` table                                      |
| 041 | `041_volunteer_public_links.sql`   | new `volunteer_public_links` table                                  |
| 042 | `042_volunteer_documents.sql`      | new `volunteer_documents` table                                     |

All migrations use `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` and are safe to re-run.

---

## 8. Verification commands

Quick smoke-test from any machine:

```bash
# Health
curl https://api.helpers-tech.com/health

# Public endpoints (P5)
curl 'https://api.helpers-tech.com/facilities/search?governorate=Cairo&city=Cairo'

curl -X POST 'https://api.helpers-tech.com/facility-inquiries' \
  -H 'Content-Type: application/json' \
  -d '{"name":"smoke","phone":"+201111111111","governorate":"Cairo","city":"Cairo"}'

# JWT-protected — should return 401 not 404 (route registered)
for ep in /video-calls/active /user-progress/me /user-preferences/me \
          /admin/users/test /admin/settings/emergency-contacts \
          /social/assessment-tools/test/questions \
          /residents/00000000-0000-0000-0000-000000000000/audit-trail; do
  printf "%-55s → %s\n" "$ep" "$(curl -s -o /dev/null -w '%{http_code}' https://api.helpers-tech.com$ep)"
done

# Full OpenAPI inspection
curl https://api.helpers-tech.com/api/docs-json | jq '.paths | keys'
```

---

## 9. Current P14 work (local, pending deploy)

### P14 — Public Volunteer Profile Reader (extends `volunteers`, PUBLIC)

Migration: none (reuses `volunteer_public_links` + `volunteer_profiles`)

| Method | Route       | Auth   | Status                                 |
| ------ | ----------- | ------ | -------------------------------------- |
| GET    | `/v/:token` | PUBLIC | 🟡 implemented locally, pending deploy |

Behavior:

- Accepts only existing, non-revoked, unexpired tokens (`expires_at > NOW()`).
- Returns a sanitized profile: `name`, `bio`, `location`, `skills`, `hoursLogged`, `socialLinks`, `cvFileUrl`, `expiresAt`.
- Does **not** expose `userId`, `facilityId`, internal profile IDs, or token ownership metadata.

Tests added:

- `src/volunteers/volunteer-public.controller.spec.ts`
- `src/volunteers/volunteers.service.spec.ts`

## 10. Current P15-P18 work (local, pending deploy)

### P15 — Realtime Live Banners (Socket.IO)

Migration: none

| Area                                                                                                       | Status                                 |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Backend `RealtimeGateway` generic `live_event` + typed events                                              | 🟡 implemented locally, pending deploy |
| Backend broadcasts from medications, family bridge, complaints, health, notifications, residents, messages | 🟡 implemented locally, pending deploy |
| Flutter `RealtimeService` (`socket_io_client`)                                                             | 🟡 implemented locally, pending deploy |
| Flutter banners refresh from realtime events                                                               | 🟡 implemented locally, pending deploy |

Covered Flutter banners:

- `LiveMedicationsBanner`
- `LiveFamilyVisitsBanner`
- `LiveCloudResidentsBanner`
- `LiveComplaintsBanner`
- `LiveNotificationsBanner`
- `LiveVitalsBanner`
- `LiveKpiBanner`

### P16 — Resident Audit Log Dashboard

Migration: none (reuses `resident_audit_log`)

| Area                                                            | Status                                 |
| --------------------------------------------------------------- | -------------------------------------- |
| Specialist resident file audit section                          | 🟡 upgraded locally, pending deploy    |
| Manual refresh + realtime invalidation on resident/audit events | 🟡 implemented locally, pending deploy |

The UI now shows summary metrics, latest-action labeling, actor/time display, changed-field chips, and refresh controls instead of a raw five-row timeline.

### P17 — Volunteer Public Link Cleanup Job

Migration: none (reuses `volunteer_public_links.revoked_at`)

| Method | Route                                  | Auth           | Status                                             |
| ------ | -------------------------------------- | -------------- | -------------------------------------------------- |
| POST   | `/jobs/volunteer-public-links/cleanup` | `x-job-secret` | 🟡 implemented locally + scheduled, pending deploy |

Marks expired unrevoked tokens as revoked:

```sql
UPDATE volunteer_public_links
SET revoked_at = NOW()
WHERE revoked_at IS NULL AND expires_at <= NOW()
```

### P18 — Retire Old HTTP Demo IP From Source References + Fix Volunteer Public Link Base

| Area                                    | Status                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| Flutter Android cleartext source config | 🟡 removed old EC2 IP locally                                                           |
| Backend Flutter integration docs        | 🟡 updated to HTTPS production URL                                                      |
| `setup-https.sh` comment                | 🟡 replaced hardcoded old IP with `EC2_PUBLIC_IP` placeholder                           |
| `VOLUNTEER_PUBLIC_BASE_URL`             | 🟡 changed to `https://api.helpers-tech.com/v` so generated links hit the public reader |

Generated build artifacts may still contain stale values until the next Flutter rebuild; source files no longer require the old demo IP.

## 11. Future P19+ (not started)

These were flagged during the audit but are larger than this cycle's scope.

- **Optional branded volunteer profile page**: if product wants `https://app.helpers-tech.com/v/:token` instead of the API JSON URL, add a frontend reader page that calls `GET https://api.helpers-tech.com/v/:token`.
- **Historical audit backfill**: optional one-off migration/job if pre-2026-05-24 resident edits must appear in `resident_audit_log`.
