# US-10-06 — Smoke-Pass Checklist

> **Purpose:** Verify the full demo environment end-to-end before the graduation
> presentation. Every step must pass without manual DB edits.

---

## Prerequisites

| # | Step | Command / Action | Expected |
|---|------|-----------------|----------|
| 0a | Schema migrations applied | `npm run db:migrate` | All 6 migration files run without errors |
| 0b | Seed data loaded | `npm run db:seed` | `COMMIT` printed, no constraint violations |
| 0c | Notifications seeded | `curl -X POST http://localhost:3000/notifications/seed-demo` | `{ "status": "ok", "added": 6, ... }` |
| 0d | Backend running | `npm run start:prod` or Docker container | Listening on port 3000 |

---

## 1. Health Check

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 1.1 | `/health` | GET | `{ "status": "ok" }` |
| 1.2 | `/api/docs` | GET (browser) | Swagger UI loads |

---

## 2. Auth (Cognito JWT)

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 2.1 | `/auth/me` | GET (with valid JWT) | Returns `userId`, `email`, `roles`, `facilityId` |
| 2.2 | `/auth/me` | GET (no token) | `401 Unauthorized` |

---

## 3. Residents

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 3.1 | `/residents` | GET | 3 residents (Ahmad, Fatimah, Omar) |
| 3.2 | `/residents/:id` | GET (Ahmad's ID) | Full resident object with `roomNumber: "101"` |
| 3.3 | `/residents` | POST | Creates a new resident, returns `201` |
| 3.4 | `/residents/:id` | PATCH | Updates fields, returns updated object |

---

## 4. Medications

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 4.1 | `/medications/schedules` | GET | 4 schedules across 3 residents |
| 4.2 | `/medications/schedules?residentId=<Ahmad>` | GET | 2 schedules (Aspirin, Metformin) |
| 4.3 | `/medications/doses` | GET | 5 dose log entries |
| 4.4 | `/medications/overdue` | GET | ≥1 overdue dose (pending before now) |
| 4.5 | `/medications/adherence?period=weekly` | GET | Report with `percentage` field |

---

## 5. Health / Vitals

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 5.1 | `/health/vitals?residentId=<Ahmad>` | GET | 2 vital readings |
| 5.2 | `/health/alerts` | GET | 2 active alerts (HR + SpO2) |
| 5.3 | `/health/thresholds` | GET | 7 threshold entries |

---

## 6. Complaints

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 6.1 | `/complaints` | GET | 4 complaints in various statuses |
| 6.2 | `/complaints?status=open` | GET | 1 open complaint |

---

## 7. Family Bridge

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 7.1 | `/family-bridge/media?residentId=<Ahmad>` | GET | 2 media items |
| 7.2 | `/family-bridge/visits` | GET | 3 visits (approved, completed, pending) |

---

## 8. Admin Management

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 8.1 | `/admin/users` | GET | 3 managed users (Admin, Nurse, disabled) |
| 8.2 | `/admin/settings` | GET | Facility settings with `timezone: Asia/Riyadh` |

---

## 9. Notifications (in-memory)

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 9.1 | `/notifications/seed-demo` | POST | `{ "status": "ok", "added": 6 }` (idempotent) |
| 9.2 | `/notifications/nurse-seed` | GET | ≥2 notifications (medication + vital alerts) |
| 9.3 | `/notifications/admin-seed` | GET | ≥1 notification (complaint) |
| 9.4 | `/notifications/:id/read` | PATCH | `{ "status": "ok" }` |

---

## 10. Scheduled Jobs

| # | Endpoint | Method | Headers | Expected |
|---|----------|--------|---------|----------|
| 10.1 | `/jobs/medication-reminder` | POST | `x-job-secret: <JOB_SECRET>` | `{ "status": "ok", "job": "medication-reminder" }` |
| 10.2 | `/jobs/daily-digest` | POST | `x-job-secret: <JOB_SECRET>` | `{ "status": "ok", "job": "daily-digest" }` |
| 10.3 | `/jobs/weekly-ai-summary` | POST | `x-job-secret: <JOB_SECRET>` | `status: ok` or `skipped` depending on `AI_ENABLED` |

---

## 11. AI Recommendations

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 11.1 | `/ai/recommendations/demo-resident` | GET | Returns `summary`, `rationale`, `flag` |

---

## 12. KPI Dashboard

| # | Endpoint | Method | Expected |
|---|----------|--------|----------|
| 12.1 | `/kpi/dashboard` | GET | Aggregated metrics from seeded data |

---

## Evidence Template

After running the checklist, record results below:

| Item | Pass/Fail | Tester | Date | Notes |
|------|-----------|--------|------|-------|
| 0a–0d Prerequisites | | | | |
| 1.x Health | | | | |
| 2.x Auth | | | | |
| 3.x Residents | | | | |
| 4.x Medications | | | | |
| 5.x Health/Vitals | | | | |
| 6.x Complaints | | | | |
| 7.x Family Bridge | | | | |
| 8.x Admin | | | | |
| 9.x Notifications | | | | |
| 10.x Jobs | | | | |
| 11.x AI | | | | |
| 12.x KPI | | | | |
| **Overall** | | | | |
