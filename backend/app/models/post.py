"""
Post model. Stored under its Circle (PK=CIRCLE#<id>, SK=POST#<id>) for fast
Circle-feed reads, and mirrored onto GSI2 for a user's post history.
"""

import uuid
import time
from app.db import get_table


def create_post(
    circle_id: str,
    author_id: str,
    author_name: str,
    title: str,
    body: str,
    image_key: str | None = None,
    link_url: str | None = None,
    held_for_review: bool = False,
) -> dict:
    table = get_table()
    post_id = str(uuid.uuid4())
    created_at = int(time.time() * 1000)  # milliseconds — matches comment.py, see note there

    item = {
        "PK": f"CIRCLE#{circle_id}",
        "SK": f"POST#{post_id}",
        "GSI2PK": f"USER#{author_id}",
        "GSI2SK": str(created_at),
        "post_id": post_id,
        "circle_id": circle_id,
        "author_id": author_id,
        "author_name": author_name,
        "title": title,
        "body": body,
        "image_key": image_key,
        "link_url": link_url,
        "created_at": created_at,
        "nod_count": 0,
        "pass_count": 0,
        "comment_count": 0,
        "removed": False,
        "held_for_review": held_for_review,
    }
    table.put_item(Item=item)

    # A small pointer so comment creation (which only knows post_id, not circle_id)
    # can find its way back to the actual post item to bump comment_count.
    # Non-transactional with the write above — acceptable at this scale; if the second
    # write ever failed independently, worst case is a post whose comment count can't
    # self-update, not data loss. Flagged rather than silently assumed safe.
    table.put_item(Item={"PK": f"POST#{post_id}", "SK": "CIRCLE_POINTER", "circle_id": circle_id})

    return item


def get_post_circle_id(post_id: str) -> str | None:
    table = get_table()
    item = table.get_item(Key={"PK": f"POST#{post_id}", "SK": "CIRCLE_POINTER"}).get("Item")
    return item["circle_id"] if item else None


def increment_comment_count(circle_id: str, post_id: str, delta: int = 1) -> None:
    table = get_table()
    table.update_item(
        Key={"PK": f"CIRCLE#{circle_id}", "SK": f"POST#{post_id}"},
        UpdateExpression="ADD comment_count :d",
        ExpressionAttributeValues={":d": delta},
    )


def get_posts_for_circle(circle_id: str, limit: int = 25, include_removed: bool = False) -> list[dict]:
    table = get_table()
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"CIRCLE#{circle_id}", ":sk": "POST#"},
        ScanIndexForward=False,  # newest first
        Limit=limit,
    )
    items = response.get("Items", [])
    if not include_removed:
        items = [i for i in items if not i.get("removed") and not i.get("held_for_review")]
    return items


def get_posts_for_user(author_id: str, limit: int = 25) -> list[dict]:
    table = get_table()
    response = table.query(
        IndexName="GSI2-user-posts",
        KeyConditionExpression="GSI2PK = :pk",
        ExpressionAttributeValues={":pk": f"USER#{author_id}"},
        ScanIndexForward=False,
        Limit=limit,
    )
    return response.get("Items", [])


def get_post(circle_id: str, post_id: str) -> dict | None:
    table = get_table()
    response = table.get_item(Key={"PK": f"CIRCLE#{circle_id}", "SK": f"POST#{post_id}"})
    return response.get("Item")


def remove_post(circle_id: str, post_id: str) -> None:
    """Soft delete — content stays for the audit trail (mod log, report history)
    but disappears from every public listing."""
    table = get_table()
    table.update_item(
        Key={"PK": f"CIRCLE#{circle_id}", "SK": f"POST#{post_id}"},
        UpdateExpression="SET removed = :r, held_for_review = :h",
        ExpressionAttributeValues={":r": True, ":h": False},
    )


def approve_post(circle_id: str, post_id: str) -> None:
    """A moderator confirming an auto-flagged (Rekognition) post is actually fine —
    clears held_for_review so it becomes publicly visible again."""
    table = get_table()
    table.update_item(
        Key={"PK": f"CIRCLE#{circle_id}", "SK": f"POST#{post_id}"},
        UpdateExpression="SET held_for_review = :h",
        ExpressionAttributeValues={":h": False},
    )


def get_feed_for_circles(circle_ids: list[str], limit: int = 50) -> list[dict]:
    """Merges recent posts from every Circle a user has joined, newest first.
    Fine at this scale (a handful of Circles per user); revisit with a fan-out
    write pattern if a user's Circle count grows large enough to make N queries costly."""
    all_posts: list[dict] = []
    for circle_id in circle_ids:
        all_posts.extend(get_posts_for_circle(circle_id, limit=limit))

    all_posts.sort(key=lambda p: p["created_at"], reverse=True)
    return all_posts[:limit]
