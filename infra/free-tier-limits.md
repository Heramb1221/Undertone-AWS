# Free-Tier Limits Reference

Tracked per service so we always know our headroom. Update this file whenever a new AWS service is added in a later phase.

| Service | Free tier limit (as of mid-2026 — verify at aws.amazon.com/free before relying on it) | Notes |
|---|---|---|
| Cognito | 10,000 Monthly Active Users, free forever (not a 12-month trial) | Should comfortably cover portfolio + early real-user stage |
| DynamoDB | 25 GB storage + 25 WCU/25 RCU provisioned capacity, free forever | Use on-demand mode carefully — on-demand has no free tier, provisioned does. **Decision: use provisioned capacity with auto-scaling capped low, not on-demand.** |
| Lambda | 1M free requests/month + 400,000 GB-seconds compute, free forever | Realtime WebSocket handlers + small utility functions |
| API Gateway | 1M REST API calls/month free for 12 months from account creation; WebSocket messages billed separately — check current pricing page | 12-month clock — track your AWS account creation date |
| S3 | 5 GB storage, 20,000 GET / 2,000 PUT requests/month, free for 12 months | Post images + avatars if self-hosting DiceBear output |
| ECS/Fargate | No dedicated free tier for Fargate compute itself — billed per vCPU/memory-second | **Cost risk area** — keep task count at 1, smallest task size (0.25 vCPU/0.5GB), and use the `down` command aggressively when not actively developing/demoing |
| ECR | 500 MB free storage/month, free for 12 months | One small backend image comfortably fits |
| Rekognition | 5,000 images/month, free for 12 months | Image moderation — cap usage, monitor via CloudWatch |
| Polly | 5 million characters/month, free for 12 months (Standard voices) | "Read aloud" feature — Standard voice only, not Neural (Neural is not covered) |
| SNS | 1 million mobile push notifications/month, free forever | Push notifications |

## Hard Rules

1. Nothing above 12-month free tier items should still be running unattended after month 12 without a cost review.
2. `infra/scripts/manage.py down` tears down everything billable (ECS tasks, NAT gateways if any) — run this whenever not actively developing/demoing.
3. Any AWS Budget alert should be set at $1 threshold immediately after `up` is first run (Phase 1 checklist item).
4. Verify exact current limits at https://aws.amazon.com/free before Phase 1 execution — free tier terms change and this table is a planning reference, not a guarantee.
