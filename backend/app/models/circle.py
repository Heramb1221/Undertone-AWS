"""
Circle model. Enforces "no duplicate Circle names" (PRD.md section 7.2) via an
atomic transact_write_items call — the same conditional-write concurrency pattern
used for CineBook's seat-booking safety. Two items are written in one transaction:

  1. PK=CIRCLENAME#<lowercased name>, SK=UNIQUE   — condition: must not already exist
  2. PK=CIRCLE#<circle_id>, SK=META               — the actual Circle record

If item 1's condition fails (name taken), the whole transaction rolls back —
no possibility of two Circles claiming the same name in a race.
"""

import uuid
import time
from botocore.exceptions import ClientError
from app.db import get_table, get_client, to_dynamo_item, TABLE_NAME


class CircleNameTakenError(Exception):
    pass


def create_circle(name: str, description: str, creator_id: str) -> dict:
    circle_id = str(uuid.uuid4())
    created_at = int(time.time())
    name_key = name.strip().lower()

    uniqueness_item = {"PK": f"CIRCLENAME#{name_key}", "SK": "UNIQUE", "circle_id": circle_id}

    meta_item = {
        "PK": f"CIRCLE#{circle_id}",
        "SK": "META",
        "GSI1PK": "CIRCLE",
        "GSI1SK": name_key,
        "circle_id": circle_id,
        "name": name,
        "description": description,
        "creator_id": creator_id,
        "moderator_ids": [creator_id],
        "created_at": created_at,
    }

    client = get_client()
    try:
        client.transact_write_items(
            TransactItems=[
                {
                    "Put": {
                        "TableName": TABLE_NAME,
                        "Item": to_dynamo_item(uniqueness_item),
                        "ConditionExpression": "attribute_not_exists(PK)",
                    }
                },
                {"Put": {"TableName": TABLE_NAME, "Item": to_dynamo_item(meta_item)}},
            ]
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "TransactionCanceledException":
            raise CircleNameTakenError(f"A Circle named '{name}' already exists.")
        raise

    return meta_item


def list_circles(limit: int = 50) -> list[dict]:
    table = get_table()
    response = table.query(
        IndexName="GSI1-circle-listing",
        KeyConditionExpression="GSI1PK = :pk",
        ExpressionAttributeValues={":pk": "CIRCLE"},
        Limit=limit,
    )
    return response.get("Items", [])


def get_circle(circle_id: str) -> dict | None:
    table = get_table()
    response = table.get_item(Key={"PK": f"CIRCLE#{circle_id}", "SK": "META"})
    return response.get("Item")
