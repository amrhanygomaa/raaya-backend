# Handover Note — Raaya Backend (US-10-08)

> Final submission reference for the graduation project.

---

## 1. Repository

| Item | Value |
|------|-------|
| **GitHub repo** | `https://github.com/amrhanygomaa/raaya-backend` |
| **Default branch** | `main` |
| **Tested commit** | _(fill in latest SHA before submission)_ |
| **CI status** | GitHub Actions → `CI/CD — Raaya Backend` |

---

## 2. App Build

| Item | Value |
|------|-------|
| **Framework** | NestJS 11 (TypeScript) |
| **Node version** | 20.x |
| **Build command** | `npm run build` (produces `dist/`) |
| **Docker image** | `<ecr-registry>/raaya-backend:latest` |
| **Start command** | `npm run start:prod` or `docker run … raaya-backend:latest` |
| **Port** | `3000` |
| **Swagger** | `http://<host>:3000/api/docs` |

### Build verification

```bash
npm ci
npm run lint          # 0 errors (warnings only)
npm test              # 191 unit tests
npm run test:e2e      # e2e tests
npm run build         # TypeScript compilation
```

---

## 3. Infrastructure (AWS-Light)

| AWS Service | Resource | Purpose |
|-------------|----------|---------|
| **EC2** | `t2.micro` | Hosts the Docker container |
| **RDS** | PostgreSQL (Free Tier) | Application database |
| **ECR** | `raaya-backend` | Docker image registry |
| **Cognito** | User Pool + App Client | Authentication & JWT |
| **Lambda** (×3) | Medication reminder, Daily digest, Weekly AI summary | Scheduled jobs via EventBridge |
| **S3** | `raaya-demo-media` | Family media uploads (private) |
| **Bedrock** | Claude 3 Haiku | AI recommendations (disabled by default) |
| **CloudWatch** | `/raaya/backend` | Container logs |

**Not used** (intentionally, for Free Tier): NAT Gateway, Multi-AZ RDS, RDS Proxy, ELB.

---

## 4. Database Setup

```bash
# Run schema migrations (001–006)
npm run db:migrate

# Seed all demo data (idempotent)
npm run db:seed

# Seed in-memory notifications
curl -X POST http://localhost:3000/notifications/seed-demo
```

Seed covers: residents (3), family members (3), linked records (3),
medication schedules (4), dose logs (5), vital thresholds (7),
vital signs (3), vital alerts (2), complaints (4), media items (3),
visits (3), managed users (3), facility settings (1), notifications (6).

---

## 5. Deploy Procedure

1. Push to `main` → CI runs lint + tests automatically.
2. Go to GitHub → Actions → `CI/CD — Raaya Backend` → Run workflow → `deploy=true`.
3. Workflow builds Docker image, pushes to ECR, SSHs into EC2, pulls and restarts.
4. Health check: `curl http://<host>:3000/health` → `{ "status": "ok" }`.

Full details: [deployment-checklist.md](deployment-checklist.md).

### Restart

```bash
docker restart raaya-api
```

### Rollback

```bash
docker stop raaya-api && docker rm raaya-api
docker run -d --name raaya-api --restart unless-stopped \
  -p 3000:3000 --env-file /home/ec2-user/.env \
  <ecr-registry>/raaya-backend:<known-good-sha>
curl http://localhost:3000/health
```

---

## 6. Environment & Secrets

| Location | File | Contents |
|----------|------|----------|
| Local dev | `.env` (from `.env.example`) | All backend env vars |
| EC2 | `/home/ec2-user/.env` | Production env vars |
| GitHub | Repository Secrets | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EC2_HOST`, `EC2_SSH_KEY`, `ECR_REGISTRY` |
| Lambda | Function env vars | `BACKEND_URL`, `JOB_SECRET` |

Full details: [environment-and-secrets.md](environment-and-secrets.md).

---

## 7. Key Operational Notes

- **AI is OFF by default** — set `AI_ENABLED=true` only during the AI demo section, then disable immediately after.
- **Deploy is manual** — the workflow never auto-deploys; it requires `deploy=true` from the Actions UI.
- **Job secret rotation** — change `JOB_SECRET` in both EC2 `.env` and each Lambda's env vars, then restart.
- **Facility scoping** — every DB query is scoped by the JWT `custom:facilityId` claim. Missing `facilityId` is rejected at the JWT validation layer (regression-tested).

---

## 8. Project Documents Index

| Document | Path | Purpose |
|----------|------|---------|
| **README** | `README.md` | Project overview, setup, and quick start |
| **API docs** | `docs/api.md` | All endpoint contracts |
| **Architecture** | `docs/architecture.md` | System design + Mermaid diagram |
| **AI companion** | `docs/ai-companion.md` | AI logic, guardrails, dialect handling |
| **Demo script** | `docs/demo-script.md` | One-page graduation demo sequence |
| **Smoke-pass checklist** | `docs/smoke-pass-checklist.md` | 30+ endpoint verification + evidence template |
| **Smoke-test checklist** | `docs/smoke-test-checklist.md` | Quick pre-demo smoke test |
| **Deployment checklist** | `docs/deployment-checklist.md` | Deploy, rollback, Free Tier safety |
| **Environment & secrets** | `docs/environment-and-secrets.md` | All env vars and where they live |
| **AWS foundation** | `docs/aws-foundation-checklist.md` | AWS resource evidence |
| **AWS-light rationale** | `docs/aws-light-foundation.md` | Why we kept it minimal |
| **Monitoring runbook** | `docs/monitoring-runbook.md` | Logs, alarms, recovery |
| **Demo data plan** | `docs/demo-data-plan.md` | Seed data design |
| **S3 media setup** | `docs/s3-media-bucket.md` | Private bucket config |
| **Handover note** | `docs/handover-note.md` | This document |

---

## 9. Test Summary

| Suite | Count | Command |
|-------|-------|---------|
| Unit tests | 191 | `npm test` |
| E2E tests | 22+ | `npm run test:e2e -- --runInBand` |
| Lint | 0 errors | `npm run lint` |
| Build | ✅ | `npm run build` |

---

## 10. Team & Contacts

| Role | Name | GitHub |
|------|------|--------|
| Lead | Amr Hany Gomaa | [@amrhanygomaa](https://github.com/amrhanygomaa) |

---

_Last updated: Sprint 6 (Weeks 11–12)_
