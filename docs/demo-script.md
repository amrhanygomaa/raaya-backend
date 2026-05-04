# Graduation Demo Script

Use this script for the backend part of the Raaya graduation demo. Keep the
demo environment small, predictable, and easy to recover.

## Pre-Demo Setup

1. Confirm GitHub Actions CI is green on `main`.
2. Confirm the demo EC2 instance is running only when needed.
3. Confirm `/home/ec2-user/.env` exists on EC2 and has:
   - `AI_ENABLED=false` by default
   - valid `COGNITO_USER_POOL_ID`
   - valid `COGNITO_CLIENT_ID`
   - valid `JOB_SECRET`
4. If AI chat will be shown, enable it only right before the AI section.

## Backend Health

Show that the deployed backend is alive:

```bash
curl http://<demo-backend-host>:3000/health
```

Expected result:

```json
{ "status": "ok" }
```

## Auth And Role Claims

Show the protected auth endpoint:

```bash
curl http://<demo-backend-host>:3000/auth/me
```

Expected result without a token: `401 Unauthorized`.

Then call the same endpoint with a valid Cognito access token:

```bash
curl http://<demo-backend-host>:3000/auth/me \
  -H "Authorization: Bearer <cognito-jwt>"
```

Expected result includes:

- `userId`
- `email`
- `role`
- `facilityId`

## Notifications

Create a demo notification:

```bash
curl -X POST http://<demo-backend-host>:3000/notifications \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo-user","message":"Medication reminder ready","type":"medication"}'
```

Read the latest notifications:

```bash
curl http://<demo-backend-host>:3000/notifications/demo-user
```

Mark one notification as read:

```bash
curl -X PATCH http://<demo-backend-host>:3000/notifications/<notification-id>/read
```

## Scheduled Jobs

Use the same `JOB_SECRET` configured on the backend:

```bash
curl -X POST http://<demo-backend-host>:3000/jobs/medication-reminder \
  -H "x-job-secret: <job-secret>"
```

```bash
curl -X POST http://<demo-backend-host>:3000/jobs/daily-digest \
  -H "x-job-secret: <job-secret>"
```

Expected result: `status: ok`.

## AI Insights With Cost Safety

With `AI_ENABLED=false`, show safe fallback:

```bash
curl http://<demo-backend-host>:3000/ai/recommendations/demo-resident
```

Expected result:

- `enabled: false`
- `flag: AI_DISABLED`
- no Bedrock call

For the AI section only, enable AI on EC2:

```bash
sed -i '/^AI_ENABLED=/d' /home/ec2-user/.env
echo "AI_ENABLED=true" >> /home/ec2-user/.env
docker restart raaya-api
```

Show AI recommendations:

```bash
curl http://<demo-backend-host>:3000/ai/recommendations/demo-resident
```

Expected result includes:

- `summary`
- `rationale`
- `generatedAt`
- `flag: HUMAN_REVIEW_REQUIRED`
- medical disclaimer

Optional AI chat:

```bash
curl -X POST http://<demo-backend-host>:3000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"residentName":"Mona","message":"أنا قلقة النهاردة"}'
```

After the AI section, disable AI again:

```bash
sed -i '/^AI_ENABLED=/d' /home/ec2-user/.env
echo "AI_ENABLED=false" >> /home/ec2-user/.env
docker restart raaya-api
```

## Closing Line

End by showing the project is intentionally AWS-light:

- manual deployments only
- no automatic Bedrock usage
- scheduled jobs are lightweight Lambda-to-backend calls
- AI output is supportive, non-diagnostic, and human-review flagged
