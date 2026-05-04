# Deployment Checklist

This checklist keeps the graduation demo deploy controlled and Free Tier-aware.
Deployment is manual-only from GitHub Actions.

## Before Deploy

1. Confirm the current branch is `main`.
2. Confirm CI is green:
   - lint
   - unit tests
   - auth e2e tests
3. Confirm the EC2 instance is needed for a demo or integration test.
4. Confirm `/home/ec2-user/.env` exists on EC2.
5. Confirm `AI_ENABLED=false` before deployment unless the demo explicitly needs AI.
6. Confirm GitHub repository secrets exist:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `EC2_HOST`
   - `EC2_SSH_KEY`
   - `ECR_REGISTRY`

## Manual Deploy

1. Open GitHub.
2. Go to `Actions`.
3. Choose `CI/CD — Raaya Backend`.
4. Click `Run workflow`.
5. Select branch `main`.
6. Set `deploy` to `true`.
7. Run the workflow.

The deploy job will:

- build a Docker image
- push it to ECR as the commit SHA and `latest`
- keep only recent non-latest ECR images
- SSH into EC2
- pull the latest image
- restart `raaya-api`
- run `/health`

## Post-Deploy Verification

Run these checks:

```bash
curl http://<demo-backend-host>:3000/health
```

```bash
curl http://<demo-backend-host>:3000/ai/recommendations/demo-resident
```

Expected safe default for AI:

- `enabled: false`
- `flag: AI_DISABLED`

Check the container on EC2:

```bash
docker ps --filter "name=raaya-api"
docker logs --tail 50 raaya-api
```

For deeper troubleshooting, use [monitoring-runbook.md](monitoring-runbook.md).

## Rollback Or Restart

For a simple restart:

```bash
docker restart raaya-api
```

To return to the previous image during a demo, use the latest known-good image
tag from ECR:

```bash
docker stop raaya-api 2>/dev/null || true
docker rm raaya-api 2>/dev/null || true
docker run -d \
  --name raaya-api \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /home/ec2-user/.env \
  <ecr-registry>/raaya-backend:<known-good-sha>
```

Then verify:

```bash
curl http://localhost:3000/health
```

## Free Tier Safety

- Do not deploy on every commit.
- Keep deploy manual-only.
- Keep `AI_ENABLED=false` outside the short AI demo section.
- Stop EC2 when the demo environment is not needed.
- Keep ECR image count small.
- Keep CloudWatch logs quiet and review log volume before final demo week.
- Use the lightweight templates in `docs/cloudwatch/` only if the demo needs
  dashboard/alarm evidence.
- Do not create NAT Gateway, Multi-AZ RDS, or RDS Proxy for the graduation MVP.

## Handover Notes

The backend owner should hand over:

- repository URL
- latest tested commit SHA
- EC2 host
- ECR repository name
- where `/home/ec2-user/.env` is stored
- how to rotate `JOB_SECRET`
- how to run the manual GitHub Actions deploy
- how to disable AI after the presentation
