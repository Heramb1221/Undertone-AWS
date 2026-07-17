# Interview-Prep.md — Undertone

## 30-second pitch

Undertone is a Reddit-shaped social platform built specifically for introverts — anonymous, interest-based identities instead of usernames, Circles instead of subreddits, Resonance/Nod/Pass/Token/Rhythm instead of karma/upvote/downvote/badge/streak. Full-stack: Next.js web, React Native mobile (fully independent codebase, not shared components), Flask backend, all on AWS — Cognito, DynamoDB, S3, ECS/Fargate, Lambda, API Gateway, Rekognition, Polly — built to stay inside AWS's free tier with usage caps enforced in code, not just documented. 20 phases, each shipped with real automated tests or live end-to-end verification, not just "looks done."

## Architecture walkthrough

```
┌─────────────┐     ┌──────────────┐
│  Next.js Web │     │ React Native │
│  (Vercel)    │     │   Mobile     │
└──────┬───────┘     └──────┬───────┘
       │  REST + WebSocket  │
       └──────────┬─────────┘
                   │
          ┌────────▼─────────┐
          │  Flask Backend    │
          │  (ECS/Fargate)    │
          └────────┬──────────┘
                    │
    ┌───────┬───────┼───────┬────────┬─────────┐
    │       │       │       │        │         │
 Cognito DynamoDB   S3   Rekognition Polly  Lambda
 (auth) (single-  (media,      (image      (text-  (WebSocket
        table)    audio)      moderation) to-speech) routing)
```

- **Web** and **mobile** are genuinely independent codebases hitting the same backend contract — not a shared component library. Each has its own API client, its own Cognito wrapper, its own design token implementation (CSS variables for web, a React Context + JS objects for mobile, since React Native has no CSS).
- **Backend** is Flask on ECS/Fargate, single DynamoDB table with a handful of GSIs (circle listing, per-user post history), not a relational schema — every access pattern was designed around specific queries the app actually needs, not a normalized schema translated into NoSQL after the fact.
- **Realtime** (live votes, live comments, live DMs) goes through a WebSocket API Gateway + Lambda layer, with REST as the fallback for everything — the app fully works over plain REST with polling if the WebSocket layer isn't deployed, by design.
- **AI services** (Rekognition for image moderation, Polly for read-aloud) are both usage-capped in code with hard-coded free-tier ceilings and fail open on any error — never block a user, never risk a paid call.

## Key technical decisions, and why

| Decision | Reasoning | Alternative considered |
|---|---|---|
| DynamoDB single-table design | One access pattern away from most queries costing a single request | RDS/Postgres — rejected to keep the free-tier story and match the single-table pattern from a prior project |
| ECS/Fargate over EKS | EKS's control plane bills hourly with no free tier at all; Fargate's smallest task size is genuinely near-free | EKS — would've been a stronger "I know Kubernetes" signal, but conflicted directly with the free-tier requirement |
| Self-vote prevention | Every mainstream platform works this way; wasn't explicitly specified, defaulted to it and flagged the assumption | Allowing self-votes — one-line change if ever wanted |
| Expo push instead of AWS SNS | Android push requires FCM credentials at the OS level no matter which service sends it — SNS doesn't bypass this, it wraps FCM. Given that, Expo's own push service is simpler and free, with no functional AWS-native alternative that avoids Firebase entirely | AWS SNS with a Firebase project used only for credential generation — the user chose the simpler path once the FCM requirement was surfaced |
| Vercel for web hosting, not S3+CloudFront | The app uses Server Components with per-request data fetching and an API route — genuinely not statically exportable without a real refactor. The AWS-native alternative (a second Fargate service) would double the only actually-billable resource in the whole stack | A second ECS/Fargate service for `next start` — rejected on cost grounds, not capability |
| No K8s cluster, just translation-layer manifests | Same free-tier reasoning as the ECS-over-EKS decision, but wanted to still demonstrate fluency — wrote real Deployment/Service/Ingress/HPA manifests mapping every ECS concept, with a README explicit about what doesn't translate (IAM/IRSA, log shipping) rather than pretending a clean 1:1 mapping exists | Actually running a cluster — cost-prohibitive for a portfolio project |

## STAR stories (all grounded in things that actually happened during this build)

### "Tell me about a bug you found and how you found it"

**Situation:** By Phase 19 (CI/CD), every AWS-provisioning function in the infra script had been *written* carefully but never actually *executed* end-to-end — each phase's AWS pieces were individually untestable from the dev sandbox (no live AWS access), so verification had stopped at "does the code look right."

**Task:** Before shipping the CI/CD pipeline, I wanted stronger proof than another read-through.

**Action:** I ran the entire `manage.py up → status → down` cycle against a mocked AWS environment (moto), working around two confirmed *mocking-library* limitations (not code bugs) to get the full flow to execute.

**Result:** It crashed immediately — `create_websocket_api()` used `os.path.join()` but the file never imported `os`. That function had been "done" since Phase 11, eight phases earlier. Also caught a second issue: a status message that flatly contradicted the line printed directly above it, left over from an earlier phase's placeholder text. Both fixed, both reverified with a full round-trip. The lesson I took from it: "the code looks right" and "the code runs" are different claims, and only one of them is actually verification.

### "Tell me about a security issue you identified"

**Situation:** Doing a launch-readiness review in the final phase, I searched the codebase for old TODO-style comments and found three places that explicitly promised authentication and CORS restriction would be handled "in the Phase 13 security pass." Phase 13 had happened — but got redefined along the way to frontend accessibility/theming work, and the backend auth piece was never actually revisited.

**Task:** Determine the actual severity and decide what to do about it with the time remaining.

**Action:** I traced the impact: every single endpoint trusted a client-supplied user id with zero verification — meaning any user could impersonate any other user, including moderator actions (banning people, deleting content), just by editing a JSON field. I built real Cognito JWT verification middleware, proved the cryptographic logic correct with a locally-signed test JWT matching Cognito's exact token shape (not just "should work"), and applied it to the single highest-privilege endpoint (moderator actions) full-stack — backend, both frontends, tests — rather than attempting an unverifiable retrofit of all ~30 endpoints in the time left.

**Result:** Verified live over HTTP: unauthenticated requests rejected, wrong-user tokens rejected, tampered tokens rejected, the old spoofing vector (claiming an id in the request body) confirmed closed. I then wrote an explicit, undecorated list of the ~19 endpoints still unprotected, ranked by risk, as the top item in the handoff docs — because shipping a "looks secure" launch narrative would have been worse than an honest "here's exactly what's fixed and what isn't."

### "Tell me about a time you changed your approach based on new information"

**Situation:** The original plan called for AWS SNS for mobile push notifications, explicitly choosing it over Firebase.

**Task:** Implement push notifications for the mobile app.

**Action:** Before writing code, I researched how Android push actually works at the OS level and found that FCM is required for Android push regardless of which service triggers the send — SNS's "Android push" is a thin layer on top of FCM, not an alternative to it. I surfaced this clearly, with the real trade-off (a Firebase project purely for credential generation vs. switching providers entirely), rather than either silently building around it or silently using Firebase without saying so.

**Result:** Given the choice, the simpler path (Expo's own push service) was chosen. I documented it as a deliberate, acknowledged architecture change, not a silent scope-cut — and separately caught a related issue while building it: Expo Go doesn't support remote push on Android at all as of the SDK version in use, discovered by checking current docs instead of relying on (likely stale) training data.

### "Tell me about a time you caught your own mistake before it caused a problem"

**Situation:** Reaching for an audio-playback library for the mobile "read aloud" feature, my first instinct was `expo-av` — the API I'd have used from memory.

**Task:** Implement audio playback correctly on a recent Expo SDK version.

**Action:** Given a previous lesson that phase about Expo's fast-moving API surface, I checked current documentation before installing anything, rather than trusting memory.

**Result:** `expo-av` had been fully removed as of the SDK version this project uses — it would not have compiled, let alone worked. Switched to the current replacement (`expo-audio`) and built against its actual hook-based API before shipping, catching what would have been a completely broken feature before it was ever "done."

## Anticipated tough questions

**"Why isn't authentication fully implemented everywhere?"**
Time-boxing in the final phase. I made a judgment call to build one thing completely and correctly (real crypto verification, tested, applied full-stack to the highest-risk endpoint) rather than a shallow pass across everything. I documented the remaining work as an explicit, prioritized list rather than leaving it implicit or unstated.

**"Why does the web app use Vercel if this is supposed to be an AWS project?"**
Because the honest technical answer beat the tidier-sounding one. The app's Server Components architecture isn't statically exportable, and the AWS-native alternative would have doubled the only real ongoing cost in the entire stack. Backend infrastructure — the actual "AWS depth" story — stayed 100% AWS. This is also just normal real-world practice; AWS backend + Vercel frontend is an extremely common pairing.

**"What would you do with more time?"**
Close the remaining authentication gap (the prioritized list exists), add rate limiting (currently absent, documented as a known gap), and actually run the mobile app on a physical device — every mobile phase was verified through type-checking and successful Metro bundling, which is real signal but not the same as watching it run.
