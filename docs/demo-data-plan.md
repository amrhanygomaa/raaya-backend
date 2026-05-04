# Demo Data Plan

This plan supports `US-10-06`: a seeded demo environment and smoke-pass checklist
for the graduation presentation.

The current backend has lightweight demo endpoints. Full resident, medication,
family, health, and reporting data will be owned by the related BE1/FE stories,
but this plan defines the minimum data needed for a stable BE2 demo.

## Demo Personas

| Persona | Purpose | Required auth claim |
| --- | --- | --- |
| Admin | Validate management-level access | `custom:role=Admin` |
| Nurse | Validate medication and notification flows | `custom:role=Nurse` |
| Family | Validate future media upload flow | `custom:role=Family` |
| Resident | Validate AI companion/resident-facing concept | `custom:role=Resident` |

Every demo user should include:

- Cognito `sub`
- `email`
- `custom:role`
- `custom:facilityId`

## Shared Demo IDs

Use stable IDs in docs, tests, and manual checks:

| ID | Value |
| --- | --- |
| Facility | `facility-demo` |
| Resident | `demo-resident` |
| Nurse user | `demo-nurse` |
| Family user | `demo-family` |
| Notification user | `demo-user` |

## Environment Values

The demo backend should use:

```text
AI_ENABLED=false
DEMO_RESIDENT_ID=demo-resident
S3_MEDIA_PREFIX=demo/
```

Turn `AI_ENABLED=true` only during the AI section, then turn it off again.

## Seeded Backend Evidence

Current BE2-verifiable flows:

| Flow | Evidence |
| --- | --- |
| Health | `GET /health` returns `{ "status": "ok" }` |
| Auth | `GET /auth/me` returns role/facility claims for a valid Cognito JWT |
| Notifications | Create/read/mark-read notification for `demo-user` |
| Jobs | Medication reminder, daily digest, weekly AI summary endpoints accept `JOB_SECRET` |
| AI fallback | `GET /ai/recommendations/demo-resident` returns `AI_DISABLED` by default |
| AI demo | `AI_ENABLED=true` returns human-review flagged AI insights |
| S3 media | Private bucket/prefix templates are documented for future media flows |

## Manual Demo Notification Seed

Create one notification before the demo if needed:

```bash
curl -X POST http://<demo-backend-host>:3000/notifications \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo-user","message":"Medication reminder ready","type":"medication"}'
```

Then confirm:

```bash
curl http://<demo-backend-host>:3000/notifications/demo-user
```

## Data Gaps To Coordinate With BE1

These records should be provided by the core API/database stories:

- resident profile for `demo-resident`
- medication schedule for `demo-resident`
- linked family account for `demo-family`
- complaint/report sample data
- health/vitals sample data
- persisted notification records if in-memory notification storage is replaced

## Acceptance Evidence

For Jira closure, attach:

- latest green CI run
- smoke checklist result
- screenshot or output of `/health`
- screenshot or output of `/auth/me`
- screenshot or output of notification flow
- screenshot or output of scheduled job response
- screenshot or output of AI disabled fallback
