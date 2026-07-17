# Cost-Audit.md — Phase 20 Launch Prep

Every AWS service this project uses, its actual free-tier status given how this app is built, and the one real recurring cost. Verified against current AWS pricing (searched, not assumed) rather than the estimates in `infra/free-tier-limits.md`, which was written in Phase 1 as a planning reference.

## The one real cost: ECS/Fargate

**Fargate has no free tier at all** — this has been flagged throughout the project (`manage.py`'s repeated "keep desiredCount at 1" warnings), and it's the only line item that actually costs money every month regardless of usage.

Current pricing (verified via web search, US East rates — ap-south-1 typically runs 10-30% higher): **$0.04048/vCPU-hour, $0.004445/GB-hour.**

This project's backend task is the smallest possible size: 0.25 vCPU / 0.5 GB, running continuously (`desiredCount: 1`).

| Component | Calculation | Monthly cost (US East) |
|---|---|---|
| vCPU | 0.25 × $0.04048 × 730 hrs | ~$7.39 |
| Memory | 0.5 × $0.004445 × 730 hrs | ~$1.62 |
| Public IPv4 address | ~$0.005/hr × 730 hrs (AWS started billing for these in 2024) | ~$3.65 |
| **Total (US East)** | | **~$12.66/month** |
| **Estimated for ap-south-1** (+10-30%) | | **~$14-16/month** |

This runs whether or not anyone is using the app. **The single most effective cost control is `python infra/scripts/manage.py down`** when not actively demoing or developing — it tears the ECS service down to zero, and this is the only resource in the entire project where "leave it running" has a real ongoing dollar cost. Everything else below is genuinely free at this project's usage scale.

## Everything else — free tier, and why it stays that way at this scale

| Service | Free tier | Why this project stays under it |
|---|---|---|
| Cognito | 10,000 MAU, free forever (not a trial) | A portfolio project's realistic user count is nowhere near this |
| DynamoDB | 25 GB + 25 RCU/WCU provisioned, free forever | `manage.py` explicitly uses provisioned capacity (5/5 per index), not on-demand — on-demand mode has no free tier, this was a deliberate choice from Phase 1 |
| S3 | 5 GB storage, 20K GET / 2K PUT per month, free for 12 months | Post images + Polly audio cache; low volume at this scale |
| Lambda (WebSocket handler) | 1M requests + 400,000 GB-seconds/month, free forever | Realtime message routing is nowhere near this volume for a small user base |
| API Gateway (WebSocket) | REST API calls have a 12-month free tier; WebSocket *messages* are billed separately with no specific free allowance found in current AWS documentation | **Flagged as needing monitoring, not confirmed free** — see below |
| ECR | 500 MB free storage/month, free for 12 months | One backend image comfortably fits |
| Rekognition | 5,000 images/month, free for 12 months | `services/rekognition.py` hard-caps usage at 4,500/month and fails open past that — enforced in code, not just planned |
| Polly | 5,000,000 characters/month (Standard voice), free for 12 months | `services/polly.py` hard-caps at 4.8M chars/month, fails open past that, and caches audio in S3 so repeat listens never re-call Polly at all |
| SNS | Not used — Phase 17 switched to Expo's push service instead, see `docs/Architecture.md`/README's Phase 17 section for why | N/A |

### API Gateway WebSocket messages — genuinely unconfirmed, flagging honestly

Unlike the other rows in this table, I could not find clear, current, specific free-tier language for WebSocket *message* volume (as opposed to connection-minutes or REST API calls) during this review. This is worth verifying directly against the AWS Pricing page before relying on it being free at any real scale — it's the one line item in the "should be free" list that deserves a second look rather than trusting the table above.

## Recommendations before real users

1. **Set a $1 AWS Budget alert immediately** if you haven't already (mentioned since Phase 1, worth repeating here as it's the actual safety net if something in this table is wrong).
2. **Verify the WebSocket message pricing directly** on AWS's current pricing page before assuming it's free at scale.
3. **Run `manage.py down` between development sessions** — the Fargate service is the only thing here that bills by the hour regardless of traffic.
4. Every 12-month free-tier item (S3, ECR, Rekognition, Polly's free allowances) should get a calendar reminder near your AWS account's 12-month mark — after that, they start billing even at low usage.
