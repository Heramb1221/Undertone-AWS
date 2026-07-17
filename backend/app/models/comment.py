"""
Comment model. Stored flat under the post (PK=POST#<id>, SK=COMMENT#<comment_id>)
so a single comment can be looked up directly — needed by the vote system (Phase 7).
Nesting is reconstructed from `parent_comment_id`, ordering from `created_at`,
both done client-side (see docs/Design.md section 4, "Threaded reply").
"""

import uuid
import time
from app.db import get_table


def create_comment(
    post_id: str, author_id: str, author_name: str, body: str, parent_comment_id: str | None = None
) -> dict:
    table = get_table()
    comment_id = str(uuid.uuid4())
    # Millisecond resolution — second-resolution timestamps caused same-second replies
    # (realistic for a fast-moving thread, and guaranteed in rapid test scenarios) to
    # sort ambiguously, since the comment_id (SK) carries no chronological ordering
    # of its own. Caught by test_phase8.py::test_deep_nested_reply_chain.
    created_at = int(time.time() * 1000)

    item = {
        "PK": f"POST#{post_id}",
        "SK": f"COMMENT#{comment_id}",
        "comment_id": comment_id,
        "post_id": post_id,
        "parent_comment_id": parent_comment_id,
        "author_id": author_id,
        "author_name": author_name,
        "body": body,
        "created_at": created_at,
        "nod_count": 0,
        "pass_count": 0,
        "removed": False,
    }
    table.put_item(Item=item)
    return item


def get_comments_for_post(post_id: str, include_removed: bool = False) -> list[dict]:
    """Returns a flat list, sorted chronologically — nesting is built client-side from parent_comment_id."""
    table = get_table()
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"POST#{post_id}", ":sk": "COMMENT#"},
    )
    items = response.get("Items", [])
    if not include_removed:
        items = [i for i in items if not i.get("removed")]
    items.sort(key=lambda c: c["created_at"])
    return items


def get_comment(post_id: str, comment_id: str) -> dict | None:
    table = get_table()
    response = table.get_item(Key={"PK": f"POST#{post_id}", "SK": f"COMMENT#{comment_id}"})
    return response.get("Item")


def remove_comment(post_id: str, comment_id: str) -> None:
    table = get_table()
    table.update_item(
        Key={"PK": f"POST#{post_id}", "SK": f"COMMENT#{comment_id}"},
        UpdateExpression="SET removed = :r",
        ExpressionAttributeValues={":r": True},
    )
