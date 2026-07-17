"""
WebSocket connection tracking. Written by the Lambda $connect/$disconnect handlers
(infra/lambda/websocket_handler.py), read by services/broadcast.py to know which
connections to push to. A user can have multiple open connections (multiple tabs/
devices), so this is a one-to-many relationship, stored both directions:

  PK=USER#<user_id>,       SK=CONN#<connection_id>   — "which connections does this user have"
  PK=CONN#<connection_id>, SK=META                   — "which user does this connection belong to"
                                                         (needed because $disconnect only gives us
                                                         the connection_id, not the user_id)

Also tracks post "subscriptions" for live vote/comment count updates:
  PK=POST#<post_id>, SK=SUB#<connection_id>
"""

from app.db import get_table


def register_connection(user_id: str, connection_id: str) -> None:
    table = get_table()
    table.put_item(Item={"PK": f"USER#{user_id}", "SK": f"CONN#{connection_id}", "connection_id": connection_id})
    table.put_item(Item={"PK": f"CONN#{connection_id}", "SK": "META", "user_id": user_id})


def get_user_for_connection(connection_id: str) -> str | None:
    table = get_table()
    item = table.get_item(Key={"PK": f"CONN#{connection_id}", "SK": "META"}).get("Item")
    return item["user_id"] if item else None


def deregister_connection(connection_id: str) -> None:
    table = get_table()
    user_id = get_user_for_connection(connection_id)
    if user_id:
        table.delete_item(Key={"PK": f"USER#{user_id}", "SK": f"CONN#{connection_id}"})
    table.delete_item(Key={"PK": f"CONN#{connection_id}", "SK": "META"})


def get_connections_for_user(user_id: str) -> list[str]:
    table = get_table()
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"USER#{user_id}", ":sk": "CONN#"},
    )
    return [item["connection_id"] for item in response.get("Items", [])]


def subscribe_to_post(post_id: str, connection_id: str) -> None:
    table = get_table()
    table.put_item(Item={"PK": f"POST#{post_id}", "SK": f"SUB#{connection_id}", "connection_id": connection_id})


def unsubscribe_from_post(post_id: str, connection_id: str) -> None:
    table = get_table()
    table.delete_item(Key={"PK": f"POST#{post_id}", "SK": f"SUB#{connection_id}"})


def get_connections_subscribed_to_post(post_id: str) -> list[str]:
    table = get_table()
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"POST#{post_id}", ":sk": "SUB#"},
    )
    return [item["connection_id"] for item in response.get("Items", [])]
