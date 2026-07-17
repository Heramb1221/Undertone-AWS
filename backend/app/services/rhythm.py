"""
Rhythm — renamed streak (docs/Glossary.md #6). Tracks consecutive calendar days
(UTC) with at least one qualifying action: posting, commenting, voting, or joining
a Circle (docs/PRD.md section 7.4 / your answer to Q10: "login, number of posts,
number of nods, etc"). This is a DEFAULT formula I picked since it wasn't fully
pinned down — easy to adjust which actions count, or to add a true "just opened
the app" login trigger once real sessions exist (Phase 13).

Known limitation: read-then-write, not transactional. Two qualifying actions from
the same user in the same instant could theoretically race — low-stakes since the
worst case is a slightly-off streak count, not data loss or a security issue.
"""

from datetime import datetime, timezone
from app.db import get_table


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def touch_rhythm(user_id: str) -> None:
    table = get_table()
    profile = table.get_item(Key={"PK": f"USER#{user_id}", "SK": "PROFILE"}).get("Item")
    if not profile:
        return  # no profile yet — nothing to track against

    today = _today_str()
    last_active = profile.get("last_active_date")

    if last_active == today:
        return  # already counted today, no-op

    if last_active:
        last_date = datetime.strptime(last_active, "%Y-%m-%d").date()
        today_date = datetime.strptime(today, "%Y-%m-%d").date()
        streak = int(profile.get("rhythm_streak_days", 0)) + 1 if (today_date - last_date).days == 1 else 1
    else:
        streak = 1

    table.update_item(
        Key={"PK": f"USER#{user_id}", "SK": "PROFILE"},
        UpdateExpression="SET rhythm_streak_days = :s, last_active_date = :d",
        ExpressionAttributeValues={":s": streak, ":d": today},
    )
