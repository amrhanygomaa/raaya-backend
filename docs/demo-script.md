# Graduation Demo Script — Final (US-10-08)

> **One-page sequence** for the Raaya graduation presentation.
> All data is pre-seeded — no manual DB edits needed.
> Estimated time: 12–15 minutes.

Set the backend URL once at the start:

```bash
BACKEND=http://<demo-backend-host>:3000
SECRET=<job-secret>
TOKEN=<cognito-jwt>
```

---

## 0 — Pre-Demo Checklist (before audience)

| # | Action | Command |
|---|--------|---------|
| 0a | CI is green on `main` | GitHub → Actions |
| 0b | EC2 running + container healthy | `curl $BACKEND/health` → `ok` |
| 0c | DB seeded | `npm run db:seed` (already done) |
| 0d | In-memory notifications seeded | `curl -X POST $BACKEND/notifications/seed-demo` |
| 0e | `AI_ENABLED=false` in `.env` | `grep AI_ENABLED /home/ec2-user/.env` |

---

## 1 — Health & Swagger (~1 min)

```bash
curl $BACKEND/health
```

Show Swagger UI in the browser: `$BACKEND/api/docs`

---

## 2 — Auth & RBAC (~1 min)

Unauthenticated → **401**:

```bash
curl -i $BACKEND/auth/me
```

With Cognito token → user profile:

```bash
curl $BACKEND/auth/me -H "Authorization: Bearer $TOKEN"
```

---

## 3 — Residents (~2 min)

List all residents (3 seeded):

```bash
curl $BACKEND/residents -H "Authorization: Bearer $TOKEN"
```

Get Ahmad Al-Rashid by ID:

```bash
curl $BACKEND/residents/a1b2c3d4-0000-0000-0000-000000000001 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4 — Medications (~2 min)

List schedules (4 seeded across 3 residents):

```bash
curl "$BACKEND/medications/schedules" -H "Authorization: Bearer $TOKEN"
```

Show Ahmad's overdue doses:

```bash
curl "$BACKEND/medications/overdue" -H "Authorization: Bearer $TOKEN"
```

Show weekly adherence report:

```bash
curl "$BACKEND/medications/adherence?period=weekly" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5 — Vitals & Alerts (~2 min)

Show Ahmad's vital signs (normal + abnormal readings):

```bash
curl "$BACKEND/health/vitals?residentId=a1b2c3d4-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $TOKEN"
```

Show active vital alerts (heart rate + SpO2):

```bash
curl "$BACKEND/health/alerts" -H "Authorization: Bearer $TOKEN"
```

---

## 6 — Complaints (~1 min)

List all complaints (4 seeded: open, in_progress, resolved, closed):

```bash
curl "$BACKEND/complaints" -H "Authorization: Bearer $TOKEN"
```

---

## 7 — Family Bridge (~1 min)

Show media items:

```bash
curl "$BACKEND/family-bridge/media?residentId=a1b2c3d4-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $TOKEN"
```

Show visits (approved, completed, pending):

```bash
curl "$BACKEND/family-bridge/visits" -H "Authorization: Bearer $TOKEN"
```

---

## 8 — Admin Management (~1 min)

List managed users (Admin, Nurse, disabled):

```bash
curl "$BACKEND/admin/users" -H "Authorization: Bearer $TOKEN"
```

Show facility settings:

```bash
curl "$BACKEND/admin/settings" -H "Authorization: Bearer $TOKEN"
```

---

## 9 — Notifications (~1 min)

Show nurse notifications (medication reminders + vital alerts):

```bash
curl $BACKEND/notifications/nurse-seed
```

Mark as read:

```bash
curl -X PATCH $BACKEND/notifications/seed-<id>/read
```

---

## 10 — Scheduled Jobs (~1 min)

```bash
curl -X POST $BACKEND/jobs/medication-reminder -H "x-job-secret: $SECRET"
curl -X POST $BACKEND/jobs/daily-digest -H "x-job-secret: $SECRET"
curl -X POST $BACKEND/jobs/weekly-ai-summary -H "x-job-secret: $SECRET"
```

Show job secret rejection:

```bash
curl -i -X POST $BACKEND/jobs/medication-reminder -H "x-job-secret: wrong"
```

---

## 11 — AI Insights (~2 min)

### Safe fallback (AI disabled)

```bash
curl $BACKEND/ai/recommendations/demo-resident
```

→ `enabled: false`, `flag: AI_DISABLED`, no Bedrock call.

### Live AI (enable only for this section)

```bash
sed -i '/^AI_ENABLED=/d' /home/ec2-user/.env
echo "AI_ENABLED=true" >> /home/ec2-user/.env
docker restart raaya-api && sleep 5
```

```bash
curl $BACKEND/ai/recommendations/demo-resident
```

→ `summary`, `rationale`, `flag: HUMAN_REVIEW_REQUIRED`, medical disclaimer.

Optional AI chat:

```bash
curl -X POST $BACKEND/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"residentName":"Ahmad","message":"أنا حاسس بشوية تعب اليوم"}'
```

### Disable AI immediately after

```bash
sed -i '/^AI_ENABLED=/d' /home/ec2-user/.env
echo "AI_ENABLED=false" >> /home/ec2-user/.env
docker restart raaya-api
```

---

## 12 — KPI Dashboard (~30 sec)

```bash
curl "$BACKEND/kpi/dashboard" -H "Authorization: Bearer $TOKEN"
```

---

## Closing

Summarize the architecture:

- **AWS-light**: EC2 + RDS + ECR + Lambda + Cognito + S3 — no NAT Gateway, no Multi-AZ
- **Manual deploy only**: GitHub Actions → ECR → EC2, never auto-deploys
- **AI cost safety**: Bedrock disabled by default, human-review flagged
- **Facility-scoped**: every query scoped by JWT `facilityId`
- **CI green**: lint + 191 unit tests + e2e tests pass on every push

---

## Recovery / Rollback

See [deployment-checklist.md](deployment-checklist.md) for full restart and rollback procedures.

Quick restart:

```bash
docker restart raaya-api
```

Quick rollback to known-good image:

```bash
docker stop raaya-api && docker rm raaya-api
docker run -d --name raaya-api --restart unless-stopped \
  -p 3000:3000 --env-file /home/ec2-user/.env \
  <ecr-registry>/raaya-backend:<known-good-sha>
```

---

## Evidence

Record the final pass using [smoke-pass-checklist.md](smoke-pass-checklist.md).
