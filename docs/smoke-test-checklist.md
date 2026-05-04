# Smoke Test Checklist

Use this checklist before the graduation presentation and after any manual
deployment. It is designed to prove the MVP is demo-ready without creating extra
AWS resources.

## Local CI Smoke

- [ ] `npm run lint`
- [ ] `npm test -- --runInBand`
- [ ] `npm run test:e2e -- --runInBand`
- [ ] `npm run build`

If local `npm run build` fails on Windows with `EPERM` while deleting `dist/`,
rerun it from an elevated shell. This is a local file-lock issue, not a build
failure.

## Deployed Backend Smoke

Set:

```bash
BACKEND=http://<demo-backend-host>:3000
```

Health:

```bash
curl "$BACKEND/health"
```

Expected:

```json
{ "status": "ok" }
```

Auth without token:

```bash
curl -i "$BACKEND/auth/me"
```

Expected: `401 Unauthorized`.

Auth with token:

```bash
curl "$BACKEND/auth/me" \
  -H "Authorization: Bearer <cognito-jwt>"
```

Expected: user id, email, role, and facility id.

## Notification Smoke

Create:

```bash
curl -X POST "$BACKEND/notifications" \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo-user","message":"Medication reminder ready","type":"medication"}'
```

Read:

```bash
curl "$BACKEND/notifications/demo-user"
```

Mark read:

```bash
curl -X PATCH "$BACKEND/notifications/<notification-id>/read"
```

Expected: `status: ok`.

## Scheduled Job Smoke

Medication reminder:

```bash
curl -X POST "$BACKEND/jobs/medication-reminder" \
  -H "x-job-secret: <job-secret>"
```

Daily digest:

```bash
curl -X POST "$BACKEND/jobs/daily-digest" \
  -H "x-job-secret: <job-secret>"
```

Weekly AI summary:

```bash
curl -X POST "$BACKEND/jobs/weekly-ai-summary" \
  -H "x-job-secret: <job-secret>"
```

Expected:

- medication reminder: `status: ok`
- daily digest: `status: ok`
- weekly AI summary with `AI_ENABLED=false`: `status: skipped`

Invalid job secret:

```bash
curl -i -X POST "$BACKEND/jobs/medication-reminder" \
  -H "x-job-secret: wrong"
```

Expected: `401 Unauthorized`.

## AI Smoke

Default safe fallback:

```bash
curl "$BACKEND/ai/recommendations/demo-resident"
```

Expected:

- `enabled: false`
- `flag: AI_DISABLED`
- no Bedrock usage

Only during the AI demo:

```bash
sed -i '/^AI_ENABLED=/d' /home/ec2-user/.env
echo "AI_ENABLED=true" >> /home/ec2-user/.env
docker restart raaya-api
```

Then:

```bash
curl "$BACKEND/ai/recommendations/demo-resident"
```

Expected:

- `enabled: true`
- `flag: HUMAN_REVIEW_REQUIRED`
- `summary`
- `rationale`
- medical disclaimer

Turn AI off again:

```bash
sed -i '/^AI_ENABLED=/d' /home/ec2-user/.env
echo "AI_ENABLED=false" >> /home/ec2-user/.env
docker restart raaya-api
```

## S3 Media Smoke

Only if media flows are demonstrated:

- [ ] bucket public access block is fully enabled
- [ ] demo upload file is small
- [ ] object uses one of the planned prefixes
- [ ] temporary files are deleted after testing

## Pass Criteria

Mark the smoke run as passed when:

- [ ] CI is green
- [ ] `/health` passes
- [ ] auth rejects missing token
- [ ] auth accepts valid Cognito token
- [ ] notification create/read/read-state works
- [ ] scheduled job endpoints accept the correct secret
- [ ] AI fallback is disabled by default
- [ ] AI is turned off after the demo
- [ ] no new cost-heavy AWS resources were created
