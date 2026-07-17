"""
Direct messages. A conversation is keyed by both participants' ids sorted
together, so both people query the same thread. A lightweight "pointer" item
per participant powers the inbox list without scanning every message.
"""

import uuid
import time
from app.db import get_table


def _conversation_id(user_a: str, user_b: str) -> str:
    return "__".join(sorted([user_a, user_b]))


class BlockedError(Exception):
    pass


def is_blocked(user_id: str, other_user_id: str) -> bool:
    """True if EITHER party has blocked the other — a block is always mutual in effect."""
    table = get_table()
    a_blocked_b = table.get_item(Key={"PK": f"USER#{user_id}", "SK": f"BLOCKED#{other_user_id}"}).get("Item")
    b_blocked_a = table.get_item(Key={"PK": f"USER#{other_user_id}", "SK": f"BLOCKED#{user_id}"}).get("Item")
    return bool(a_blocked_b or b_blocked_a)


def block_user(user_id: str, blocked_user_id: str) -> None:
    table = get_table()
    table.put_item(Item={"PK": f"USER#{user_id}", "SK": f"BLOCKED#{blocked_user_id}", "blocked_user_id": blocked_user_id})


def unblock_user(user_id: str, blocked_user_id: str) -> None:
    table = get_table()
    table.delete_item(Key={"PK": f"USER#{user_id}", "SK": f"BLOCKED#{blocked_user_id}"})


def send_message(sender_id: str, recipient_id: str, body: str) -> dict:
    if is_blocked(sender_id, recipient_id):
        raise BlockedError("You can't message this person.")

    table = get_table()
    conversation_id = _conversation_id(sender_id, recipient_id)
    message_id = str(uuid.uuid4())
    created_at = int(time.time() * 1000)

    message = {
        "PK": f"DM#{conversation_id}",
        "SK": f"MSG#{created_at}#{message_id}",
        "message_id": message_id,
        "conversation_id": conversation_id,
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "body": body,
        "created_at": created_at,
    }
    table.put_item(Item=message)

    # Upsert an inbox pointer for BOTH participants so listing "my conversations"
    # is one cheap query per user instead of scanning every message ever sent.
    for owner, other in [(sender_id, recipient_id), (recipient_id, sender_id)]:
        table.put_item(
            Item={
                "PK": f"USER#{owner}",
                "SK": f"DMCONV#{conversation_id}",
                "conversation_id": conversation_id,
                "other_user_id": other,
                "last_message": body,
                "last_message_at": created_at,
            }
        )

    return message


def get_conversation(user_a: str, user_b: str, limit: int = 50) -> list[dict]:
    table = get_table()
    conversation_id = _conversation_id(user_a, user_b)
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"DM#{conversation_id}", ":sk": "MSG#"},
        Limit=limit,
    )
    return response.get("Items", [])


def list_conversations_for_user(user_id: str) -> list[dict]:
    table = get_table()
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"USER#{user_id}", ":sk": "DMCONV#"},
    )
    items = response.get("Items", [])
    items.sort(key=lambda c: c["last_message_at"], reverse=True)
    return items
