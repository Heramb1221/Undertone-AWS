# Glossary.md — Renamed Systems Reference

Single source of truth for naming. Every doc, every API field, every UI string should match this exactly, so nothing drifts mid-build.

| # | Reddit concept | Undertone term | Notes / rationale |
|---|---|---|---|
| 1 | Karma | **Resonance** | Net score from Nods received across posts/comments. Displayed on profile, not chased publicly (no leaderboard in v1). |
| 2 | Upvote | **Nod** | Agreement/appreciation, quiet gesture. |
| 3 | Downvote | **Pass** | Not "dislike" — softer, "this isn't for me" framing. |
| 4 | Subreddit / Community | **Circle** | A Circle can't share a name with an existing Circle (enforced at creation). |
| 5 | Badge | **Token** | Earned for milestones. Full list drafted in Phase 10, confirmed with you before build. |
| 6 | Streak | **Rhythm** *(proposed — confirm or reject)* | Tracks consecutive days active, tied to login/posting/Nod-giving. Formula confirmed in Phase 10. |
| 7 | Report | **Report** *(unchanged, intentional)* | Kept blunt per your direction — introverts value directness over euphemism. |
| 8 | Moderator | **Circle Moderator** | Unchanged term — clear and functional, no need to rename. |
| 9 | DM / Chat | **DM** *(unchanged)* | Kept simple; no rename needed, functional term. |
| 10 | User handle (u/username) | **Anonymous Identity** | Generated from selected interests at onboarding — e.g. `QuietReader_42`, `MoonlitCoder_7`. Rerollable and editable. |

### API/field naming convention (for backend consistency)
- `resonance_score` (int)
- `nod_count` / `pass_count`
- `circle_id`, `circle_name`
- `token_id` (earned badges)
- `rhythm_streak_days`
- `report_reason`, `report_status`

This file will be updated any time you approve a new rename — treat it as the canonical dictionary for both frontend copy and backend schema.
