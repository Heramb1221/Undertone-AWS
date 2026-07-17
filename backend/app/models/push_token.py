"""
Push token storage. One token per user (overwritten on each registration —
a user re-registering, e.g. after reinstalling, naturally replaces the stale
token rather than accumulating dead ones).
"""

from app.db import get_table


def save_push_token(user_id: str, token: str, platform: str) -> None:
    table = get_table()
    table.put_item(Item={"PK": f"USER#{user_id}", "SK": "PUSH_TOKEN", "token": token, "platform": platform})


def get_push_token(user_id: str) -> str | None:
    table = get_table()
    item = table.get_item(Key={"PK": f"USER#{user_id}", "SK": "PUSH_TOKEN"}).get("Item")
    return item["token"] if item else None
