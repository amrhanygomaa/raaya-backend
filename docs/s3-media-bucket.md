# S3 Media Bucket Runbook

This runbook documents the lightweight S3 media setup for the graduation MVP.
It is intentionally private-by-default and demo-sized.

## Goal

Support family photos and voice notes without storing media inside the backend
container.

## Bucket Shape

Use one bucket for the demo environment:

```text
raaya-demo-media-<account-id>
```

Recommended prefixes:

| Prefix | Purpose |
| --- | --- |
| `family-uploads/audio/` | Voice notes uploaded by family users |
| `family-uploads/photos/` | Photos uploaded by family users |
| `resident-playback/` | Media prepared for resident-facing playback |
| `tmp/` | Temporary upload objects |
| `exports/` | Demo export files if needed |

Do not make the bucket public. The intended application flow is:

1. Backend authorizes the user.
2. Backend creates a scoped presigned upload or download URL.
3. Client uploads/downloads one object through the presigned URL.
4. Bucket listing remains unavailable to public clients.

## Required Environment

Backend or future media service variables:

| Variable | Purpose |
| --- | --- |
| `S3_MEDIA_BUCKET` | Demo media bucket name |
| `S3_MEDIA_PREFIX` | Optional base prefix, usually empty or `demo/` |
| `AWS_REGION` | Bucket region |

Keep these in `.env` or `/home/ec2-user/.env`, not in source code.

## Templates

Templates live in `docs/s3/`:

- `public-access-block.json`
- `bucket-policy-private.json`
- `backend-media-iam-policy.json`
- `cors.json`
- `lifecycle.json`

They are not applied automatically. Replace placeholders before using them:

- `REPLACE_WITH_MEDIA_BUCKET`
- `REPLACE_WITH_ACCOUNT_ID`
- `https://REPLACE_WITH_DEMO_APP_ORIGIN`

## Manual Verification

After applying the S3 setup manually in AWS, verify:

```bash
aws s3api get-public-access-block --bucket <bucket-name>
```

Expected: all public access block flags are `true`.

Verify listing is not public:

```bash
aws s3 ls s3://<bucket-name>
```

This should only work for an authenticated AWS principal with explicit access.

Verify test upload through the intended backend/presigned flow. Do not upload
large files during the Free Tier demo.

## Free Tier Safety

- Keep demo files small.
- Delete temporary test files after the demo.
- Keep lifecycle cleanup for `tmp/` enabled.
- Avoid public access.
- Avoid large video uploads for the graduation MVP.
