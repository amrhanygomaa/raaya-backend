# AWS Foundation Checklist

Use this checklist while viewing the AWS Console. It is intentionally manual so
no resources are created accidentally.

## Account And Region

- [ ] Confirm the selected account is the graduation demo account.
- [ ] Confirm the selected region is `us-east-1`.
- [ ] Confirm no AWS Organizations setup was created for this MVP.

## Compute And Registry

- [ ] Confirm one demo backend runtime exists.
- [ ] Confirm the ECR repository `raaya-backend` exists.
- [ ] Confirm old ECR images are cleaned up or limited.
- [ ] Confirm deploy is manual-only in GitHub Actions.

## Networking

- [ ] Confirm no NAT Gateway exists.
- [ ] Confirm no unused load balancer exists.
- [ ] Confirm backend security group exposes only required demo ports.
- [ ] Confirm SSH is restricted to team/admin IPs, not public internet.
- [ ] Confirm database inbound access, if present, is limited to backend only.

## Database

- [ ] Confirm PostgreSQL is Single-AZ if RDS is enabled.
- [ ] Confirm no RDS Proxy exists.
- [ ] Confirm no Multi-AZ database is enabled.
- [ ] Confirm no unnecessary read replica exists.

## Cognito

- [ ] Confirm one User Pool exists for the demo.
- [ ] Confirm one App Client exists for the backend/mobile flow.
- [ ] Confirm custom attributes exist or are planned:
  - `custom:role`
  - `custom:facilityId`

## S3

- [ ] Confirm one media bucket exists if media flows are being demonstrated.
- [ ] Confirm public access block is fully enabled.
- [ ] Confirm prefixes are prepared:
  - `family-uploads/audio/`
  - `family-uploads/photos/`
  - `resident-playback/`
  - `tmp/`
  - `exports/`
- [ ] Confirm lifecycle cleanup exists for `tmp/`.

## Jobs And Monitoring

- [ ] Confirm EventBridge schedules exist only for needed demo jobs.
- [ ] Confirm Lambda functions are small wrappers.
- [ ] Confirm `/raaya/backend` CloudWatch log group exists after deploy.
- [ ] Confirm Lambda log groups exist after first invocation.
- [ ] Confirm optional CloudWatch dashboard/alarm templates are documented.

## Closure

- [ ] Save screenshots or command outputs for Jira.
- [ ] Add the Jira closure note from `docs/aws-light-foundation.md`.
