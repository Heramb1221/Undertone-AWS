# PRD.md — Product Requirements Document

**Status:** Draft v1 — awaiting your sign-off before development begins
**Owner:** Heramb
**Project type:** Full-stack, multi-client (Web + Mobile + Backend), real-users, AWS-native, portfolio + production-track

---

## 1. Working Name

You didn't have a name yet. Proposed options (all keep the "anonymous, cozy, honest" identity — pick one, tweak one, or reject all and we brainstorm more):

| Option | Why it fits |
|---|---|
| **Undertone** | Quiet things said beneath the surface — matches "share freely, secretly." |
| **Nook** | A small, private, cozy space — direct match to your "warm and cozy" design brief. |
| **Hush** | Simple, honest, on-theme with anonymity + calm. |
| **Quietly** | Reads like a verb/brand ("posted Quietly") — modern, soft. |
| **Undercover** *(playful)* | Leans into the "secretly" part more directly. |

*Placeholder used throughout all docs until you decide: **`Undertone`***

---

## 2. Vision Statement

> A place where you can go anonymous and share your thoughts, ideas, notes, and details — basically everything — freely, without judgment, and without anyone knowing it's you.

Undertone is a Reddit-shaped platform built specifically for people who think a lot and say little out loud. Every mechanic Reddit popularized (karma, upvotes, subreddits, badges, streaks) is reimagined with introvert-first language and introvert-first defaults: no public follower counts, no read receipts, no performance metrics — just Resonance, Circles, and honest conversation.

## 3. Target User

- Engineering/college-age to young-professional users who think deeply but don't always speak up.
- People who want a space to post thoughts/journals/questions without their real identity attached to it.
- People who like Reddit's structure (threads, communities, voting) but find its culture loud, performative, or hostile.

## 4. Problem Statement

Mainstream social platforms reward loudness, real-identity performance, and constant visibility (read receipts, follower counts, "seen" indicators). Introverts often disengage entirely rather than participate under those conditions. There's no dedicated space that keeps Reddit's *proven mechanics* (threads, voting, communities, reputation) while removing the *performative* layer and adding introvert-specific defaults (quiet mode, interest-based anonymous identity, blunt-but-fair moderation).

## 5. Renamed System (full detail in `Glossary.md`)

| Reddit concept | Undertone name |
|---|---|
| Karma | **Resonance** |
| Upvote / Downvote | **Nod / Pass** |
| Subreddit / Community | **Circle** |
| Badge | **Token** |
| Streak | **Rhythm** *(suggested — flag if you'd rather keep "Streak")* |
| Report | **Report** (kept blunt, unchanged — per your call: introverts value honesty over euphemism) |

## 6. Core Principles (drive every design/eng decision)

1. **Pseudonymous by design** — no real name, no real photo, ever required.
2. **Interest-based identity** — anonymous name is generated from interests selected at onboarding (user can reroll or manually edit).
3. **Quiet by default** — no read receipts, no "online now," no public follower/following counts.
4. **Blunt, not cruel** — moderation and reporting language is direct and honest, not sugar-coated, but still against a firm harassment policy.
5. **Everything nested** — comments are fully threaded, like Reddit, not flattened.

## 7. Feature Set

### 7.1 Identity & Onboarding
- Interest selection at signup → generates anonymous name (adjective + interest-noun + number), user can reroll or edit.
- Abstract avatar system (illustrated/geometric, never photographic) — user customizes color/shape, not a real photo. *(Flagged for Design.md exploration before build.)*
- Cognito-backed auth (email or phone, no real name field required).

### 7.2 Posting & Circles
- Text, image, and link posts.
- Circles (communities) — open creation for any user, **no duplicate Circle names** allowed.
- Circle moderators: pinned posts, remove post/comment, ban from Circle, moderator log.
- 10 seed Circles at launch (topics to confirm with you — draft list in section 9).

### 7.3 Threads & Reactions
- Nested/threaded comments, Reddit-depth style, collapsible.
- Nod / Pass voting on posts and comments.
- Resonance score per user, computed from net Nods received.

### 7.4 Reputation & Engagement
- Tokens (badges) for milestones — e.g., first post, 100 Resonance, active in 5 Circles. Full list to be drafted and confirmed with you before build (Phase 10).
- Rhythm (streak) tracked on: consecutive-day logins, posts made, Nods given — exact scoring formula confirmed with you in Phase 10.

### 7.5 Direct Messaging
- 1:1 DMs between anonymous identities, real-time.
- Users can block/mute another anonymous identity from DMs.

### 7.6 Moderation & Safety
- Blunt "Report" button/flow — direct language, categorized reasons (harassment, spam, doxxing attempt, etc.).
- Circle-level moderator roles from day one (not a later phase — per your instruction).
- AI-assisted moderation: Rekognition flags on uploaded images (nudity/violence detection) *only if usage stays inside AWS free tier* — confirmed in Architecture.md.

### 7.7 Realtime
- Live vote count updates, live new-comment updates, live DM delivery — via WebSocket (API Gateway WebSocket API + Lambda).

### 7.8 Notifications
- Push notifications (mobile, via **AWS SNS** — confirmed, no Firebase) for: DM received, reply to your post/comment, Circle moderator actions on your content.

### 7.9 Accessibility Nice-to-Have
- Polly-powered "read post aloud" (text-to-speech) — a genuinely on-brand introvert feature (consume content without reading fatigue). Confirmed as free-tier-only usage.

## 8. Explicit Non-Goals (v1)

- No real-name social graph, no contact-import "find your friends."
- No public follower/following counts anywhere in the UI.
- No paid tiers, ads, or any AWS service outside free tier.
- No iOS build in Phase 1 (Android-first, per your answer); iOS added later once you have an Apple dev account.

## 9. Draft Seed Circles (confirm/edit before launch)

1. Quiet Hobbies
2. Late Night Thoughts
3. Book Nook
4. Social Anxiety Support
5. Overthinkers Anonymous
6. Introvert Career Talk
7. Small Wins
8. Deep Questions
9. Study & Focus
10. Comfort Media (movies/shows/games that feel safe)

## 10. Success Metrics (since you want real users, not just a demo)

- Activation: % of signups who complete onboarding (interest selection + first anonymous name generated).
- Engagement: posts + comments per weekly active user.
- Retention: 7-day and 30-day return rate.
- Safety: report-to-resolution time, repeat-offender rate.

## 11. Tech Stack Summary (full detail in `Architecture.md`)

- **Web:** Next.js
- **Mobile:** React Native (fully independent codebase from web, same backend API), Android-first
- **Backend:** Python (Flask) + boto3, region `ap-south-1` (Polly/Rekognition may use `us-east-1` if that keeps them free)
- **Database:** DynamoDB (single-table design, per your CineBook precedent)
- **Auth:** AWS Cognito
- **Compute:** ECS/Fargate (containers), documented migration path to Kubernetes (no real K8s in v1 — EKS isn't free-tier)
- **CI/CD:** GitHub Actions → ECR → ECS
- **Realtime:** API Gateway WebSocket API + Lambda
- **AI services:** Rekognition (image moderation), Polly (text-to-speech) — free-tier scoped only

## 12. Why This Beats a Standard Student Project (interview framing)

- Reimagines a well-known product mechanic (Reddit) rather than cloning it — shows product thinking, not just CRUD skills.
- Full separation of concerns across three independently deployable clients hitting one backend contract.
- Real moderation/trust-and-safety design (blunt reporting, moderator roles, AI-assisted flagging) — most student projects skip trust & safety entirely.
- AWS-native architecture with a documented container→orchestration story (ECS now, K8s-ready design) — a real conversation point for infra interviews.
- Built for real users, not just a demo — forces you to reason about retention, moderation load, and abuse cases, not just features.

---

**Next:** Once you confirm the name, the seed Circles, and the Rhythm rename (or reject it), I'll move to `Design.md`.
