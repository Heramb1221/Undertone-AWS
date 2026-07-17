"""
Tokens — renamed badges (docs/Glossary.md #5). This exact list is a DEFAULT I
picked since it wasn't finalized with you — every id/label/threshold below is
easy to edit, add to, or remove; nothing here is load-bearing elsewhere in the
codebase besides the `id` strings, so renaming a label is always safe.
"""

from app.db import get_table
from app.models.membership import get_joined_circle_ids

TOKENS = [
    {"id": "first_words", "label": "First Words", "description": "Made your first post."},
    {"id": "breaking_the_silence", "label": "Breaking the Silence", "description": "Made your first comment."},
    {"id": "circle_starter", "label": "Circle Starter", "description": "Started a Circle."},
    {"id": "familiar_face", "label": "Familiar Face", "description": "Joined 5 Circles."},
    {"id": "deep_reader", "label": "Deep Reader", "description": "Reached 50 Resonance."},
    {"id": "quiet_influence", "label": "Quiet Influence", "description": "Reached 200 Resonance."},
    {"id": "steady_presence", "label": "Steady Presence", "description": "A 7-day Rhythm."},
    {"id": "old_soul", "label": "Old Soul", "description": "A 30-day Rhythm."},
]

_CHECKS = {
    "first_words": lambda s: s["posts_count"] >= 1,
    "breaking_the_silence": lambda s: s["comments_count"] >= 1,
    "circle_starter": lambda s: s["circles_created_count"] >= 1,
    "familiar_face": lambda s: s["joined_circles_count"] >= 5,
    "deep_reader": lambda s: s["resonance_score"] >= 50,
    "quiet_influence": lambda s: s["resonance_score"] >= 200,
    "steady_presence": lambda s: s["rhythm_streak_days"] >= 7,
    "old_soul": lambda s: s["rhythm_streak_days"] >= 30,
}


def _gather_stats(user_id: str, profile: dict) -> dict:
    return {
        "posts_count": int(profile.get("posts_count", 0)),
        "comments_count": int(profile.get("comments_count", 0)),
        "circles_created_count": int(profile.get("circles_created_count", 0)),
        "resonance_score": int(profile.get("resonance_score", 0)),
        "rhythm_streak_days": int(profile.get("rhythm_streak_days", 0)),
        "joined_circles_count": len(get_joined_circle_ids(user_id)),
    }


def get_awarded_token_ids(user_id: str) -> set[str]:
    table = get_table()
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"USER#{user_id}", ":sk": "TOKEN#"},
    )
    return {item["token_id"] for item in response.get("Items", [])}


def list_tokens_for_user(user_id: str) -> list[dict]:
    table = get_table()
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"USER#{user_id}", ":sk": "TOKEN#"},
    )
    return response.get("Items", [])


def check_and_award_tokens(user_id: str) -> list[dict]:
    """Call after any action that could cross a Token threshold. Cheap and
    idempotent — re-checks every unawarded Token, skips ones already held."""
    table = get_table()
    profile = table.get_item(Key={"PK": f"USER#{user_id}", "SK": "PROFILE"}).get("Item")
    if not profile:
        return []

    stats = _gather_stats(user_id, profile)
    already_awarded = get_awarded_token_ids(user_id)
    newly_awarded = []

    for token in TOKENS:
        if token["id"] in already_awarded:
            continue
        if _CHECKS[token["id"]](stats):
            table.put_item(
                Item={
                    "PK": f"USER#{user_id}",
                    "SK": f"TOKEN#{token['id']}",
                    "token_id": token["id"],
                    "label": token["label"],
                }
            )
            newly_awarded.append(token)

    return newly_awarded
