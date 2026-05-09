# Final Submission Folder — Raaya Backend

This folder is the final handover/submission index for US-10-08.

---

## Repository Reference

| Item | Reference |
|------|-----------|
| Repository | `https://github.com/amrhanygomaa/raaya-backend` |
| Default branch | `main` |
| CI workflow | `.github/workflows/deploy-workflow.yml` |
| Manual deploy workflow | GitHub Actions → `CI/CD — Raaya Backend` → `deploy=true` |
| Latest tested commit | Fill before final upload: `<commit-sha>` |

---

## App Build References

| Item | Reference |
|------|-----------|
| Runtime | Node.js 20 |
| Framework | NestJS 11 + TypeScript |
| Install | `npm ci` |
| Build | `npm run build` |
| Unit tests | `npm test -- --runInBand` |
| E2E tests | `npm run test:e2e -- --runInBand` |
| Lint | `npm run lint` |
| Docker image | `<ecr-registry>/raaya-backend:<commit-sha>` and `latest` |
| Backend container | `raaya-api` |
| Health check | `GET /health` |
| Swagger | `GET /api/docs` |

---

## Demo Data References

| Item | Reference |
|------|-----------|
| Schema migrations | `migrations/001_create_residents.sql` through `migrations/006_create_admin_management.sql` |
| Master seed script | `migrations/seed_all.sql` |
| Run migrations | `npm run db:migrate` |
| Run seed | `npm run db:seed` |
| Seed notifications | `POST /notifications/seed-demo` |
| Smoke evidence | `docs/smoke-pass-checklist.md` |

---

## Project Documents

| Document | Path |
|----------|------|
| SRS (IEEE 29148:2018, bilingual) | `docs/final-submission/SRS.md` |
| Project README | `README.md` |
| Final demo script | `docs/demo-script.md` |
| Handover note | `docs/handover-note.md` |
| Deployment checklist | `docs/deployment-checklist.md` |
| Smoke-pass checklist | `docs/smoke-pass-checklist.md` |
| Environment and secrets | `docs/environment-and-secrets.md` |
| Architecture overview | `docs/architecture.md` |
| API documentation | `docs/api.md` |
| AI companion and safety | `docs/ai-companion.md` |
| AWS foundation checklist | `docs/aws-foundation-checklist.md` |
| AWS-light rationale | `docs/aws-light-foundation.md` |
| Monitoring runbook | `docs/monitoring-runbook.md` |
| Demo data plan | `docs/demo-data-plan.md` |
| S3 media bucket setup | `docs/s3-media-bucket.md` |

---

## Restart And Rollback References

Detailed steps are in `docs/deployment-checklist.md`.

Restart:

```bash
docker restart raaya-api
curl http://localhost:3000/health
```

Rollback:

```bash
docker stop raaya-api 2>/dev/null || true
docker rm raaya-api 2>/dev/null || true
docker run -d \
  --name raaya-api \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /home/ec2-user/.env \
  <ecr-registry>/raaya-backend:<known-good-sha>
curl http://localhost:3000/health
```

---

## Final Acceptance Evidence

| Check | Result |
|-------|--------|
| One-page demo sequence exists | `docs/demo-script.md` |
| Restart and rollback documented | `docs/deployment-checklist.md`, `docs/demo-script.md` |
| Final submission folder exists | `docs/final-submission/` |
| Repo reference included | This file + `docs/handover-note.md` |
| App build references included | This file + `docs/handover-note.md` |
| Project documents included | This file + `docs/handover-note.md` |
