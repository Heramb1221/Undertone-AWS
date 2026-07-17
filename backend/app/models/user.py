"""
User profile model — the Anonymous Identity. Deliberately keyed by Cognito's `sub`
(user_id) but storing NOTHING that ties back to a real name, per PRD.md principle #1.
"""

import time
from app.db import get_table


def create_profile(user_id: str, anonymous_name: str, avatar_seed: str, interests: list[str]) -> dict:
    table = get_table()
    item = {
        "PK": f"USER#{user_id}",
        "SK": "PROFILE",
        "user_id": user_id,
        "anonymous_name": anonymous_name,
        "avatar_seed": avatar_seed,
        "interests": interests,
        "resonance_score": 0,
        "rhythm_streak_days": 0,
        "posts_count": 0,
        "comments_count": 0,
        "circles_created_count": 0,
        "created_at": int(time.time()),
    }
    table.put_item(Item=item)
    return item


def get_profile(user_id: str) -> dict | None:
    table = get_table()
    response = table.get_item(Key={"PK": f"USER#{user_id}", "SK": "PROFILE"})
    return response.get("Item")


def get_profile_by_name(anonymous_name: str) -> dict | None:
    table = get_table()
    response = table.scan(
        FilterExpression="SK = :sk AND anonymous_name = :name",
        ExpressionAttributeValues={":sk": "PROFILE", ":name": anonymous_name}
    )
    items = response.get("Items", [])
    return items[0] if items else None


def increment_counter(user_id: str, field: str, delta: int = 1) -> None:
    """Generic ADD helper for posts_count/comments_count/circles_created_count.
    No-ops safely if the profile doesn't exist yet (e.g. test fixtures using a raw
    user_id without going through onboarding) — DynamoDB would otherwise create a
    bare partial item, which get_profile/tokens.py already handle defensively via
    .get(field, 0), but skipping is cleaner than growing junk items."""
    table = get_table()
    if not get_profile(user_id):
        return
    table.update_item(
        Key={"PK": f"USER#{user_id}", "SK": "PROFILE"},
        UpdateExpression=f"ADD {field} :d",
        ExpressionAttributeValues={":d": delta},
    )
