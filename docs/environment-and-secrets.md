# Environment And Secrets

This project uses runtime environment variables instead of committing secrets.
Use `.env.example` as the safe template for local development and the demo EC2
environment.

## Local Backend

1. Copy `.env.example` to `.env`.
2. Fill in the Cognito values from the demo User Pool and App Client.
3. Keep `AI_ENABLED=false` unless you are intentionally testing the demo AI flow.
4. Run the backend:

```bash
npm run start:dev
```

Required local/backend variables:

| Variable | Purpose | Safe default |
| --- | --- | --- |
| `PORT` | Backend HTTP port | `3000` |
| `AWS_REGION` | AWS region for Cognito/Bedrock clients | `us-east-1` |
| `COGNITO_USER_POOL_ID` | Cognito issuer/user pool id | placeholder only |
| `COGNITO_CLIENT_ID` | Cognito app client audience | placeholder only |
| `JOB_SECRET` | Shared secret for scheduled backend jobs | random demo secret |
| `AI_ENABLED` | Enables Bedrock-backed demo chat when `true` | `false` |
| `DEMO_RESIDENT_ID` | Resident id used by demo weekly summary job | `demo-resident` |
| `S3_MEDIA_BUCKET` | Private S3 bucket for demo media uploads | placeholder only |
| `S3_MEDIA_PREFIX` | Optional base prefix for media objects | empty |

`COGNITO_JWKS_URI` is for tests/local overrides only. Leave it empty in the AWS
demo so the app uses Cognito's normal JWKS endpoint.

## Demo EC2

The deployment workflow starts the Docker container with:

```bash
--env-file /home/ec2-user/.env
```

Keep `/home/ec2-user/.env` on the EC2 instance and do not commit it. It should
mirror the backend values above, with `NODE_ENV=production`.

## Lambda Jobs

The Lambda wrappers call backend job endpoints. Configure these variables on
each Lambda:

| Variable | Purpose |
| --- | --- |
| `BACKEND_URL` | Public or private HTTP base URL of the backend |
| `JOB_SECRET` | Same value as the backend `JOB_SECRET` |

Current job endpoints:

- `POST /jobs/medication-reminder`
- `POST /jobs/daily-digest`
- `POST /jobs/weekly-ai-summary`

The weekly AI job is feature-flagged. When `AI_ENABLED=false`, it returns
`status: skipped` and does not call Bedrock.

## GitHub Actions Secrets

Set these in GitHub repository secrets for manual deployment:

| Secret | Purpose |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | AWS access key used by GitHub Actions |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key used by GitHub Actions |
| `EC2_HOST` | Demo EC2 host/IP |
| `EC2_SSH_KEY` | Private SSH key for the demo EC2 user |
| `ECR_REGISTRY` | Account ECR registry, for example `account.dkr.ecr.us-east-1.amazonaws.com` |

Deploy is manual-only. Pushes to `main` run lint/tests, but deployment only runs
from GitHub Actions `Run workflow` with `deploy=true`.
See the full deployment flow in [deployment-checklist.md](deployment-checklist.md).

## AI Demo Toggle

Use this on the EC2 instance on presentation day:

```bash
sed -i '/^AI_ENABLED=/d' /home/ec2-user/.env
echo "AI_ENABLED=true" >> /home/ec2-user/.env
docker restart raaya-api
```

Turn it off after the demo:

```bash
sed -i '/^AI_ENABLED=/d' /home/ec2-user/.env
echo "AI_ENABLED=false" >> /home/ec2-user/.env
docker restart raaya-api
```

This avoids duplicate `AI_ENABLED` lines and keeps Bedrock disabled by default.
The presentation flow is documented in [demo-script.md](demo-script.md).

## S3 Media

The planned S3 media setup is documented in [s3-media-bucket.md](s3-media-bucket.md).
Keep the bucket private and use presigned URLs through the backend flow.
