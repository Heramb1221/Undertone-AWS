# Security-Review.md — Phase 20 Launch Prep

**Status: honest, not reassuring.** This document exists to tell you exactly where the application stands before real users touch it — what's fixed, what isn't, and in what order to fix the rest. Nothing here is softened for the sake of a clean launch narrative.

---

## 1. The core finding: authentication was never actually implemented

Since Phase 4, every endpoint that performs an action "as" a user (posting, voting, joining, reporting, messaging, moderating) has trusted a `user_id`/`author_id`/`moderator_id`/`sender_id` field **supplied directly in the request body or query string**, with no verification that the caller is actually who they claim to be. Comments in the code (`main.py`, `rhythm.py`) explicitly promised this would be fixed "in the Phase 13 security pass" — that never happened, because Phase 13 was redefined to frontend polish (theming, accessibility) partway through the project. This is a real gap that sat unaddressed for nine phases before this review caught it.

**What this meant in practice, until this phase:** anyone with API access could impersonate any other user for any action, including moderator actions (banning users, deleting content) — just by putting a different id in a JSON field.

### 1.1 What's fixed now

- **`backend/app/auth.py`** — real Cognito JWT verification (RS256 signature check, expiry, issuer, audience, JWKS key matching). Tested against a locally-generated RSA keypair with hand-signed tokens matching Cognito's exact shape (`backend/tests/test_phase20_auth.py`) — 8 tests covering valid tokens, tampered signatures, expired tokens, wrong audience, wrong issuer, unknown key id, malformed tokens, and the full Flask decorator flow. All pass.
- **`POST /api/circles/<id>/reports/<id>/resolve`** (moderator resolve action — ban/remove/dismiss) is now protected by `@require_auth`. The moderator's identity comes from the verified JWT's `sub` claim, not a trusted body field. Verified live, end-to-end, over real HTTP: no token → 401; valid token but not actually a moderator of that Circle → 403; tampered token → 401; valid token, real moderator → 200 success. Also explicitly confirmed the *old* spoofing vector (`{"moderator_id": "mod1", "action": "remove"}` with no token) now returns 401 instead of succeeding.
- **CORS** was previously wide open (`CORS(app)`, any origin). Now restricted to an explicit `ALLOWED_ORIGINS` env var, defaulting to localhost dev ports only — never `*`.
- Both web and mobile now have a `getCurrentIdToken()` helper (`lib/cognito.ts` in each) and the moderator-resolve call site in both frontends attaches a real `Authorization: Bearer` header. This is a genuine full-stack fix for this one endpoint, not just a backend-only demonstration.

### 1.2 What's still unprotected — the honest, complete list

This was the single highest-privilege action, prioritized given the time available in a final phase. **Everything else listed below still trusts a client-supplied id with no verification:**

| Endpoint | Method | Risk if spoofed | Priority |
|---|---|---|---|
| `/api/dm/send` | POST | Send messages as someone else | **Critical** |
| `/api/push/register` | POST | Hijack someone else's push notifications | **Critical** |
| `/api/identity` (create) | POST | Overwrite another user's Anonymous Identity profile (uses `put_item`, no ownership check) | **Critical** |
| `/api/circles/<id>/posts` | POST | Post as someone else | High |
| `/api/posts/<id>/comments` | POST | Comment as someone else | High |
| `/api/circles/<id>/posts/<id>/vote`, `/api/posts/<id>/comments/<id>/vote` | POST | Vote as someone else (affects Resonance/Tokens) | High |
| `/api/circles/<id>/join`, `/leave` | POST | Join/leave Circles as someone else | Medium |
| `/api/dm/block`, `/unblock` | POST | Block/unblock as someone else | Medium |
| `/api/circles/<id>/reports` (create) | POST | Create reports as someone else | Medium |
| `/api/circles` (create) | POST | Create Circles as someone else | Low |
| `/api/circles/<id>/reports` (list), `/moderation/log` | GET | Read the moderator queue / mod log by claiming `moderator_id` in a query string, no verification | High (information disclosure) |
| `/api/uploads/presigned-url` | POST | `user_id` only used for S3 key namespacing, not an authorization decision | Low |

### 1.3 Why the rest wasn't retrofitted this phase, and what it would take

Retrofitting the remaining ~19 endpoints means: adding `@require_auth` to each, replacing every trusted body/query field with `g.user_id`, updating every corresponding call site in **both** independent frontends (web and mobile each have their own `api.ts`), and updating every existing test that calls these endpoints to attach a valid token — the same pattern this phase used for the one endpoint fixed, just at roughly 19x the surface area. This is real, scoped, mechanical work — not a design problem — and is the single most important thing to do before this application handles real user data.

**Recommended order:** Critical row first (DM send, push register, identity create — these have the worst per-incident impact), then High, then Medium, then Low. The GET endpoints with information disclosure risk (moderator queue reads) should be treated as High despite being read-only, since they leak moderation-sensitive content to anyone willing to guess or brute-force a `moderator_id` value.

---

## 2. Other security review findings

### 2.1 S3 — confirmed correct, no changes needed
The media bucket has `BlockPublicAccess` fully enabled (all four settings), and every read goes through a short-lived presigned URL (`services/s3.py`, `services/polly.py`) — never a direct public link. This was built correctly from Phase 6 onward and re-confirmed during this review, not newly fixed.

### 2.2 Rate limiting — not implemented, flagging honestly
There is no rate limiting anywhere in this application — not on login attempts, not on posting, not on voting, not on report submission. A single user (or script) can currently hit any endpoint as fast as the network allows. **Recommendation:** `Flask-Limiter` for application-level limits (e.g., 10 posts/hour, 60 votes/hour per user) as a fast first step, plus API Gateway request throttling if/when the backend sits behind API Gateway rather than being hit directly. Not built this phase — time was prioritized on the authentication gap, which is more severe than the absence of rate limiting.

### 2.3 Input validation — basic, not schema-enforced
Every route does manual `if not field: return 400` checks for required fields, which is functionally correct but not comprehensive — there's no length limits on post/comment bodies, no schema validation library (e.g., Pydantic, Marshmallow), and no sanitization beyond what Python's type coercion does naturally. Not a critical gap (DynamoDB has no injection risk the way SQL does, and both frontends render user content through React/React Native's default escaping, which prevents XSS from stored content), but worth hardening — e.g., a malicious 10MB comment body is currently accepted without complaint.

### 2.4 Rekognition/Polly fail-open — intentional, not a gap
Both AI moderation services are designed to fail open (content posts normally) on any API error or free-tier budget exhaustion, documented clearly in `services/rekognition.py` and `services/polly.py`. This is a deliberate trade-off (never block a legitimate user over an infra hiccup, never risk a paid API call) — noting it here so it reads as a decision, not an oversight, if it comes up in review.

### 2.5 Secrets — clean
No credentials, API keys, or secrets are committed anywhere in the repository. Everything sensitive (AWS credentials, Cognito pool IDs) is read from environment variables, consistent throughout every phase.

---

## 3. Summary for a real launch

**Do not launch to real users without addressing at least the "Critical" row in section 1.2** (DM send, push token registration, identity creation). These three, left as-is, mean any user can send messages as anyone else, hijack anyone else's push notifications, or overwrite anyone else's profile — the kind of gap that turns into a genuinely bad incident, not just a theoretical finding.

The "High" and "Medium" rows matter but are lower-stakes (mostly reputation/Resonance manipulation, which is unpleasant but not a safety or privacy incident). Rate limiting and input validation hardening are real but secondary to closing the authentication gap.
