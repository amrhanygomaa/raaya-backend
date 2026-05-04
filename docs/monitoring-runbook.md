# Monitoring Runbook

This runbook covers lightweight monitoring for the graduation demo. Keep it
simple: CloudWatch logs, one backend health alarm, and quick recovery commands.

## Log Locations

Backend container logs are sent by Docker's `awslogs` driver:

| Component | CloudWatch log group |
| --- | --- |
| Backend container | `/raaya/backend` |
| Medication reminder Lambda | `/aws/lambda/raaya-medication-reminder` |
| Daily digest Lambda | `/aws/lambda/raaya-daily-digest` |
| Weekly AI summary Lambda | `/aws/lambda/raaya-weekly-ai-summary` |

## What To Check First

1. Confirm the backend is alive:

```bash
curl http://<demo-backend-host>:3000/health
```

2. Confirm the container is running on EC2:

```bash
docker ps --filter "name=raaya-api"
```

3. Read recent container logs:

```bash
docker logs --tail 100 raaya-api
```

4. Check CloudWatch log group `/raaya/backend` for deploy or runtime errors.

## Scheduled Job Troubleshooting

If a scheduled job does not appear to run:

1. Check the EventBridge schedule is enabled.
2. Check the Lambda log group for an invocation.
3. Confirm Lambda has:
   - `BACKEND_URL`
   - `JOB_SECRET`
4. Confirm the backend has the same `JOB_SECRET`.
5. Call the backend job endpoint manually:

```bash
curl -X POST http://<demo-backend-host>:3000/jobs/weekly-ai-summary \
  -H "x-job-secret: <job-secret>"
```

Expected AI-off result:

- `status: skipped`
- `recommendation.enabled: false`
- no Bedrock usage

## AI Cost Safety

Keep AI disabled except during the AI demo:

```bash
grep '^AI_ENABLED=' /home/ec2-user/.env
```

If needed, disable it:

```bash
sed -i '/^AI_ENABLED=/d' /home/ec2-user/.env
echo "AI_ENABLED=false" >> /home/ec2-user/.env
docker restart raaya-api
```

## Basic Alarm Recommendation

For the demo, one practical alarm is enough:

- alarm when EC2 `StatusCheckFailed` is greater than `0`
- evaluation period: 1 minute
- threshold: 0

Optional but useful:

- CloudWatch log metric filter for the text `ERROR`
- alarm when error count is greater than `0`

Templates are in `docs/cloudwatch/`. They are not applied automatically.

## Recovery Commands

Restart the app:

```bash
docker restart raaya-api
```

Check health locally on EC2:

```bash
curl http://localhost:3000/health
```

If logs are noisy during final demo week, keep only the needed debug lines and
avoid repeatedly testing Bedrock chat.
