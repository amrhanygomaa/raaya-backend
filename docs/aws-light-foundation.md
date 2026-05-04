# AWS-Light Foundation Evidence

This document is the evidence pack for `US-01-01`. It proves the graduation MVP
uses one small demo environment with only the AWS pieces needed for the demo.

## Demo Foundation Scope

| Area | MVP choice |
| --- | --- |
| Account | One AWS account for the graduation demo |
| Region | `us-east-1` |
| Compute | One demo backend runtime, currently EC2 + Docker/ECR for Free Tier safety |
| Container registry | One ECR repository: `raaya-backend` |
| Database | One low-cost PostgreSQL instance if database work is enabled |
| Auth | Cognito User Pool and App Client |
| Media | One private S3 bucket for photos/audio |
| Scheduled jobs | EventBridge schedules + small Lambda wrappers |
| Monitoring | Basic CloudWatch logs, optional dashboard/alarm templates |

The original Jira wording mentions ECS Fargate. The current implementation uses
an EC2 demo host with Docker to reduce cost risk. If the academic board requires
the exact ECS wording, treat that as a scope decision before creating ECS
resources.

## Required Evidence

Collect these screenshots or command outputs before marking the story as final:

| Evidence | Expected result |
| --- | --- |
| AWS account and region | Single demo account, `us-east-1` |
| EC2 or compute screen | One demo backend runtime only |
| ECR repository | `raaya-backend` exists |
| Security groups | Only required inbound ports are open |
| NAT Gateway page | No NAT Gateways |
| RDS database page | Single-AZ only, no Multi-AZ |
| RDS Proxy page | No RDS Proxies |
| S3 bucket page | One private media bucket, public access blocked |
| Cognito page | One User Pool/App Client for demo |
| EventBridge schedules | Medication reminder, daily digest, optional weekly AI summary |
| CloudWatch logs | `/raaya/backend` and Lambda log groups visible |

Store screenshots in the final submission folder, not necessarily in this repo.

## Network Rules

Minimum security group posture for the demo:

| Resource | Inbound | Notes |
| --- | --- | --- |
| Backend EC2/demo host | HTTP app port only from demo audience or team IPs | Port `3000` is used by the current Docker container |
| SSH | Team/admin IP only | Do not leave `0.0.0.0/0` on port `22` |
| RDS PostgreSQL | Backend security group only | Do not expose `5432` publicly |
| S3 | No public bucket access | Use private access and future presigned URLs |

Avoid:

- NAT Gateway
- RDS Proxy
- Multi-AZ RDS
- public S3 objects
- broad inbound `0.0.0.0/0` except a consciously temporary demo HTTP rule

## IAM Roles

Keep IAM roles small and purpose-specific:

| Role/User | Minimum purpose |
| --- | --- |
| GitHub Actions deploy principal | ECR push, optional deployment actions only |
| EC2 instance role | ECR pull and CloudWatch logs |
| Lambda execution role | CloudWatch logs and only the services each job needs |
| Backend media role | scoped S3 read/write to media prefixes only |

Do not use root credentials for deployment.

## Read-Only Audit Commands

These commands do not create resources. Run only when you intentionally want to
collect evidence from the configured AWS account.

```bash
aws sts get-caller-identity
aws configure get region
```

Check networking and expensive resources:

```bash
aws ec2 describe-nat-gateways --region us-east-1
aws rds describe-db-proxies --region us-east-1
aws rds describe-db-instances --region us-east-1 \
  --query "DBInstances[].{DB:DBInstanceIdentifier,Engine:Engine,Class:DBInstanceClass,MultiAZ:MultiAZ,Public:PubliclyAccessible}"
```

Check compute, registry, and security groups:

```bash
aws ec2 describe-instances --region us-east-1 \
  --query "Reservations[].Instances[].{Id:InstanceId,State:State.Name,Type:InstanceType,PublicIp:PublicIpAddress}"

aws ecr describe-repositories --region us-east-1 \
  --query "repositories[].repositoryName"

aws ec2 describe-security-groups --region us-east-1 \
  --query "SecurityGroups[].{Name:GroupName,Id:GroupId,Ingress:IpPermissions}"
```

Check core demo services:

```bash
aws cognito-idp list-user-pools --max-results 10 --region us-east-1
aws s3api list-buckets --query "Buckets[].Name"
aws scheduler list-schedules --region us-east-1
aws lambda list-functions --region us-east-1 \
  --query "Functions[].FunctionName"
```

## Jira Closure Note

Suggested Jira comment:

```text
AWS-light foundation documented and verified for the graduation demo. The setup
uses one demo account/region, private S3 media planning, Cognito auth, ECR,
manual deploy, EventBridge/Lambda jobs, and CloudWatch logs. Cost-heavy
resources are intentionally excluded: no NAT Gateway, no RDS Proxy, no Multi-AZ
RDS. Deploy remains manual to protect Free Tier usage.
```
