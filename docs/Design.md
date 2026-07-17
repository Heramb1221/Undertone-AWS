# Design.md — Design Philosophy & UX

## 1. Design Mood

**Dark-mode-first, warm and cozy** — not the cold, neon-on-black "hacker" dark mode. Think low-lit reading room: warm charcoal backgrounds, soft amber/terracotta accents, generous whitespace even in dark mode, rounded corners, no harsh pure-black or pure-white.

Both **light and dark themes** will be fully designed (per your answer) — light mode keeps the same warm, cozy feeling (think cream paper, not clinical white).

## 2. Design Principles

1. **Quiet by default** — no loud notification badges, no red dots everywhere, no aggressive CTAs. Calls to action are present but never shout.
2. **Nothing performative** — no follower counts, no "online now" indicators, no read receipts anywhere in the UI.
3. **Honesty in UI copy** — error messages, report flows, and moderation notices are direct and human, never corporate or vague.
4. **Depth over noise** — nested threads should feel navigable, not overwhelming; use indentation + subtle connecting lines, collapsible by default past 3 levels deep.
5. **Anonymity feels safe, not sterile** — the abstract avatar system and interest-based names should feel personal even though they're not "real."

## 3. Information Architecture

```
Undertone
├── Home Feed (personalized, from joined Circles)
├── Explore Circles
│   └── Circle Page (posts, pinned, moderators, rules)
│       └── Post Detail (nested comments)
├── Create Post
├── Create Circle
├── DMs
│   └── Conversation Thread
├── Profile (own)
│   ├── Anonymous Identity (name, avatar, reroll/edit)
│   ├── Resonance, Tokens, Rhythm
│   └── Your Posts / Comments
├── Notifications
├── Settings
│   ├── Account (Cognito-linked email/phone)
│   ├── Privacy
│   └── Blocked Users
└── Report Flow (contextual, from any post/comment/DM)
```

## 4. Core User Flows (to detail with wireframes in Phase 2)

1. **Onboarding** → select interests → preview generated anonymous name + avatar → reroll option → confirm → land on Explore Circles (suggest joining based on interests).
2. **Posting** → choose Circle → text/image/link → preview → post (real-time appears in Circle feed).
3. **Nodding/Passing** → tap-and-hold shows Resonance impact (optional micro-interaction, confirm before build).
4. **Threaded reply** → reply nests visually under parent, collapsible.
5. **DM flow** → start DM from a user's comment/post → real-time conversation.
6. **Report flow** → blunt category selection ("Harassment," "Doxxing attempt," "Spam," "Other") → optional detail → submitted, no fake "thanks for helping our community" fluff.
7. **Moderator flow** → Circle moderators see a queue of reported content + action log.

## 5. Avatar System — CONFIRMED: DiceBear

Using **DiceBear** (MIT-licensed, free, open-source, self-hostable, no real-identity data required). Avatar is generated deterministically from the user's Anonymous Identity seed — same seed always produces the same avatar, no photo upload ever involved.

- Style: `lorelei` or `notionists` (soft, illustrated, warm — to preview both in Phase 2 and pick one against the Colour.md palette).
- Integration: self-hosted via the official Docker image (keeps it fully free-tier, no dependency on rate limits of the public API) — runs as a small container alongside the backend on ECS/Fargate, or called via the public `api.dicebear.com` HTTP API for early phases since it requires no signup and is free for this scale.
- User can reroll (new random seed) or lock in a specific avatar from a short generated set at onboarding.

## 6. Logo & Brand Mark

Proposal: a simple **wordmark-first** logo (typography-driven, since abstract icons take longer to get "right" and risk looking generic). A small icon mark (e.g., a soft speech-bubble/leaf/moon motif — matching the calm theme) can be layered in once the name is finalized. **Full logo exploration happens in Phase 2, after you pick the name.**

## 7. Component Approach

- Component library: custom-built on Tailwind (Next.js) + a shared design-token file (colors/spacing/typography) so Design.md/Colour.md/Spacing.md map directly to code — not just documentation.
- Mobile (React Native) will use its own native component set but pull from the *same* design tokens (Colour.md/Spacing.md/Typography.md) to keep brand consistency despite fully independent codebases.

## 8. Accessibility

- WCAG AA contrast minimum, even in the warm/cozy dark palette (checked in Colour.md).
- Full screen-reader labeling given the introvert/accessibility overlap with the Polly "read aloud" feature.
- No motion-heavy transitions by default (respect `prefers-reduced-motion`).
