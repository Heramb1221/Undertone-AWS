"""
Circle bans. Checked at join, post, and comment creation time.
"""

from app.db import get_table


def ban_user(circle_id: str, user_id: str, moderator_id: str, reason: str) -> None:
    table = get_table()
    table.put_item(
        Item={
            "PK": f"CIRCLE#{circle_id}",
            "SK": f"BAN#{user_id}",
            "user_id": user_id,
            "banned_by": moderator_id,
            "reason": reason,
        }
    )


def unban_user(circle_id: str, user_id: str) -> None:
    table = get_table()
    table.delete_item(Key={"PK": f"CIRCLE#{circle_id}", "SK": f"BAN#{user_id}"})


def is_banned(circle_id: str, user_id: str) -> bool:
    table = get_table()
    item = table.get_item(Key={"PK": f"CIRCLE#{circle_id}", "SK": f"BAN#{user_id}"}).get("Item")
    return item is not None
