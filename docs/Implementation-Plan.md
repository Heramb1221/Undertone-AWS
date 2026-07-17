# Implementation-Plan.md — Phased Development Plan

Web is designed and built first, then mobile, per your instruction. Each phase ends with a working, demoable checkpoint (per your answer to build "everything," phases are still sequenced — nothing skips ahead, but nothing is left half-built at the end of a phase either).

---

### Phase 1 — Foundations
Monorepo scaffold (`web/`, `mobile/`, `backend/`, `infra/`, `docs/`), Cognito User Pool created, DynamoDB table + GSIs designed and created, `infra/free-tier-limits.md` written, boto3 `up`/`status`/`down` skeleton.
**Checkpoint:** Empty backend deployed to ECS/Fargate, reachable via API Gateway, Cognito signup/login works end-to-end via Postman.

### Phase 2 — Design System Build
Design tokens (Colour.md, Typography.md, Spacing.md) turned into a real Tailwind config + shared token file. Logo/wordmark finalized. Mood board finalized. Avatar system direction confirmed and prototyped.
**Checkpoint:** A working Next.js Storybook-style page showing every core component (buttons, cards, Nod/Pass, Token chip) in both themes.

### Phase 3 — Web: Onboarding & Identity
Interest selection UI → anonymous name generation logic (backend) → avatar picker → Cognito account linked to Anonymous Identity profile.
**Checkpoint:** New user can sign up and land with a working anonymous identity.

### Phase 4 — Backend: Core Data Layer
Full DynamoDB schema implemented (users, Circles, posts, comments), Circle-name uniqueness enforced, core CRUD endpoints for posts/Circles.
**Checkpoint:** API can create/read Circles and posts via Postman.

### Phase 5 — Web: Circles
Explore Circles page, Create Circle flow, Circle page (posts, rules, pinned).
**Checkpoint:** User can create a Circle and see it live.

### Phase 6 — Web: Posting & Feed
Create Post flow (text/image/link), Home Feed (from joined Circles), image upload to S3.
**Checkpoint:** Full post-creation-to-feed loop works.

### Phase 7 — Web: Nod/Pass & Resonance
Voting logic, Resonance calculation, live count updates (initial polling, WebSocket added Phase 11).
**Checkpoint:** Voting changes Resonance visibly.

### Phase 8 — Web: Nested Comments
Threaded comment system, collapsible past 3 levels, reply flow.
**Checkpoint:** Full nested conversation works on a post.

### Phase 9 — Web: Tokens & Rhythm
Token (badge) definitions finalized with you, award-trigger logic, Rhythm (streak) tracking and display.
**Checkpoint:** Profile shows live Resonance, Tokens, Rhythm.

### Phase 10 — Web: Moderation & Reporting
Blunt Report flow, Circle Moderator role + queue, moderator action log, ban-from-Circle.
**Checkpoint:** A moderator can review and act on a reported post.

### Phase 11 — Web: Realtime Layer
API Gateway WebSocket API + Lambda wired in for live votes, live comments, live DM delivery (DM UI built here too).
**Checkpoint:** Two browser sessions see each other's votes/comments/DMs update live.

### Phase 12 — Web: AI-Assisted Moderation
Rekognition image moderation on upload, Polly "read aloud" on posts — both gated behind free-tier usage checks.
**Checkpoint:** Flagged image is held for moderator review; a post can be read aloud.

### Phase 13 — Web: Polish & Full QA Pass
Accessibility pass (contrast, screen reader, reduced motion), empty states, error states, light/dark theme QA across every screen.
**Checkpoint:** Web app is feature-complete end to end.

### Phase 14 — Mobile: Foundations (Android-first)
React Native project scaffold, Cognito auth wired independently, shared design tokens ported to RN styling.
**Checkpoint:** Mobile app can sign up/log in.

### Phase 15 — Mobile: Onboarding, Feed & Circles
Full parity build of onboarding, feed, Circle browsing/creation.
**Checkpoint:** Mobile user can complete onboarding and browse Circles.

### Phase 16 — Mobile: Posting, Voting, Comments
Full parity build of posting, Nod/Pass, nested comments (2-level visible cap, per Spacing.md).
**Checkpoint:** Mobile posting-to-comment loop matches web functionally.

### Phase 17 — Mobile: DMs, Realtime, Push Notifications
WebSocket integration on mobile, DM UI, push notifications via **AWS SNS** (confirmed — no Firebase, keeps the stack fully AWS-native).
**Checkpoint:** Mobile receives a live push notification for a new DM.

### Phase 18 — Mobile: Moderation, Tokens, Rhythm, Polish
Full parity build of remaining features, QA pass on Android.
**Checkpoint:** Mobile app is feature-complete, matching web.

### Phase 19 — CI/CD & Infra-as-Code
GitHub Actions pipelines for all three clients (lint/build/deploy), Docker + ECR + ECS deploy automation, `infra/k8s-equivalent/` manifests written and documented (no live cluster, per your decision).
**Checkpoint:** A push to `main` auto-deploys backend to ECS and builds web/mobile artifacts.

### Phase 20 — Launch Prep
10 seed Circles created, security review (auth, S3 signed URLs, rate limiting), cost/free-tier audit, final interview-prep doc (architecture walkthrough, decisions log, STAR stories) — matching your AI Digest precedent, then final project handoff (zip).
**Checkpoint:** Undertone is live, seeded, and ready for real users.

---

## Notes

- Every phase's "Checkpoint" is a real, running demo — nothing is built invisibly across multiple phases.
- Feature lists inside each phase (e.g., exact Token list, exact push notification service) are flagged for your confirmation at that phase, not decided unilaterally now.
- If at any point you want to reorder, split, or merge phases, this file is the place we adjust it — treat it as living, not fixed.
