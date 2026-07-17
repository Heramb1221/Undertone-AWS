# Architecture.md — Technical & AWS Architecture

## 1. Repo Structure (Monorepo)

```
undertone/
├── web/          # Next.js app
├── mobile/       # React Native app (fully independent codebase)
├── backend/      # Flask API + boto3 AWS integration
├── infra/        # boto3 automation scripts (up/status/down), Dockerfiles, GitHub Actions workflows
└── docs/         # This documentation set
```

## 2. Backend

- **Framework:** Flask (Python), consistent with your CineBook/emotion-detection precedent.
- **API style:** REST for CRUD (posts, Circles, profile), WebSocket (API Gateway WebSocket API) for realtime (live votes, live comments, DMs).
- **AWS SDK:** boto3, automation scripts supporting `up` / `status` / `down` commands (matching your existing pattern).

## 3. Data Layer — DynamoDB

Single-table design (per your CineBook precedent and your explicit preference for DynamoDB over relational/Mongo).

**Primary table: `Undertone`**

| PK | SK | Entity |
|---|---|---|
| `USER#<id>` | `PROFILE` | User profile, anonymous identity, Resonance, Rhythm |
| `CIRCLE#<id>` | `META` | Circle metadata, name (unique-checked), rules |
| `CIRCLE#<id>` | `POST#<postId>` | Post belonging to a Circle |
| `POST#<id>` | `COMMENT#<commentId>` | Comment (nested via parentCommentId attribute) |
| `USER#<id>` | `DM#<otherUserId>#<timestamp>` | DM messages |
| `USER#<id>` | `TOKEN#<tokenId>` | Earned Tokens |

GSIs planned for: Circle-name uniqueness lookup, user's post history, trending posts per Circle (by Resonance/time decay) — finalized in Phase 4 with you before table creation.

## 4. Auth — AWS Cognito

- Cognito User Pool — email or phone signup, **no real-name field collected**.
- Anonymous Identity (interest-based generated name) stored as a separate profile attribute, decoupled from the Cognito login credential — so even internally, login identity and public identity are separated by design.
- Cognito-issued JWTs used for API authorization (Flask validates via Cognito's public JWKS).

## 5. Compute — ECS/Fargate (confirmed, no EKS)

- Backend Flask API containerized (Docker) → pushed to **ECR** → deployed on **ECS/Fargate** (serverless containers, free-tier eligible in small usage).
- **Kubernetes note (per your decision):** Real K8s (EKS) is skipped since it has no free tier. `infra/k8s-equivalent/` will contain equivalent Kubernetes manifests (Deployment/Service/Ingress YAML) purely as a **documented translation layer** — so you can speak fluently to "how this would run on K8s" in interviews, without paying for a live cluster.

## 6. Serverless — Lambda + API Gateway

- **API Gateway (REST)**: fronts specific lightweight endpoints (e.g., Circle-name uniqueness check, Token-award triggers) as Lambda functions, where a full container round-trip is unnecessary.
- **API Gateway (WebSocket)**: powers realtime — connect/disconnect/message routes, backed by Lambda, connection IDs tracked in DynamoDB.

## 7. Storage — S3

- Post images, avatar assets, uploaded media — private bucket, served via signed URLs (never public-read by default, matching the pseudonymity principle — no direct-linkable media).

## 8. AI Services (free-tier scoped only)

| Service | Feature | Region | Notes |
|---|---|---|---|
| **Rekognition** | Flags uploaded images for nudity/violence before they go live in a Circle | `us-east-1` (per your approval) if it keeps usage free; else skipped | Moderation-assist only — final action still requires a Circle moderator or auto-hold, never silent auto-delete |
| **Polly** | "Read post aloud" text-to-speech | `us-east-1` (per your approval) if free | Nice-to-have, later phase, cut immediately if it risks going outside free tier |

Both are explicitly optional/cuttable if free-tier limits are at risk — never silently upgraded to paid usage.

## 8a. Avatars — DiceBear

- MIT-licensed, free, no signup. Avatar SVG generated deterministically from the user's Anonymous Identity seed.
- Public API (`api.dicebear.com`) used initially — zero infra cost, no rate-limit risk at this scale.
- Self-hosted Docker container documented as a drop-in swap (`infra/dicebear/`) if usage ever needs to move in-house — matches the "everything free-tier, everything ours" principle.

## 9. CI/CD — GitHub Actions

- On push to `main` (per client folder):
  - `web/` → lint, build, deploy to **Vercel** (resolved in Phase 19 — see the reasoning note below; not S3+CloudFront)
  - `backend/` → lint, test, build Docker image, push to ECR, deploy to ECS
  - `mobile/` → lint, build (APK for Android-first), attach as GitHub Actions artifact for manual install/testing (no Play Store cost assumed for now)

### Why Vercel, not S3+CloudFront, for web (resolved Phase 19)

This was left as an open question back in Phase 1. Building the actual CI/CD pipeline in Phase 19 forced a real answer, for a concrete technical reason: the web app uses async Server Components that fetch data on every request (`app/circles/page.tsx`, Circle detail, post detail) and a serverless API route (`app/api/generate-name`). That means it is **not statically exportable** — `next export` would break the live data fetching, and true S3+CloudFront static hosting only works for fully static sites. Making it static would mean converting every server-fetched page to client-side fetching, a real refactor, not a config change.

The alternative that keeps 100% AWS would be a second small ECS/Fargate service just for `next start`. Rejected specifically because **Fargate has no free tier at all** — every task, however small, bills continuously. This project's infra has repeatedly prioritized staying free-tier-safe (see `infra/free-tier-limits.md`, the `keep desiredCount at 1` warnings throughout `manage.py`); doubling the one genuinely-billable resource in the whole stack to avoid using Vercel's free tier for the frontend didn't hold up against that priority.

**Resolution:** web deploys to Vercel (free tier, purpose-built for exactly this Next.js SSR + API route pattern). Everything else — Cognito, DynamoDB, S3, ECS/Fargate (backend only), Lambda, API Gateway, Rekognition, Polly — stays on AWS. This is also just normal industry practice (AWS backend + Vercel frontend is an extremely common real-world pairing), not an exotic choice, and it's worth being able to explain the trade-off in an interview rather than not knowing it was made.

## 10. Region Summary

- **Default region:** `ap-south-1` — Cognito, DynamoDB, ECS/Fargate, ECR, API Gateway, Lambda, S3.
- **Exception region:** `us-east-1` — Rekognition and/or Polly *only if* required to stay within free tier; confirmed with you before this is implemented, and clearly logged in the infra scripts so cross-region calls are never a surprise.

## 11. Cost Discipline

- Every AWS resource created by the `infra/` boto3 scripts is tagged `Project=Undertone` for easy cost tracking and full teardown via the `down` command.
- Free-tier limits documented per service in `infra/free-tier-limits.md` (built in Phase 1) so you always know your headroom.
- No resource is provisioned without appearing in this document first.
