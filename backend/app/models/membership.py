"""
Circle membership. A user "joining" a Circle is what makes it show up in their
Home Feed (docs/Design.md section 3). Stored both directions so both queries
("is this user a member" and "list a user's Circles") are single, cheap lookups.
"""

from app.db import get_table


def join_circle(user_id: str, circle_id: str) -> None:
    table = get_table()
    table.put_item(Item={"PK": f"USER#{user_id}", "SK": f"MEMBER_OF#{circle_id}", "circle_id": circle_id})


def leave_circle(user_id: str, circle_id: str) -> None:
    table = get_table()
    table.delete_item(Key={"PK": f"USER#{user_id}", "SK": f"MEMBER_OF#{circle_id}"})


def get_joined_circle_ids(user_id: str) -> list[str]:
    table = get_table()
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"USER#{user_id}", ":sk": "MEMBER_OF#"},
    )
    return [item["circle_id"] for item in response.get("Items", [])]
