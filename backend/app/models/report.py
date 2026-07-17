"""
Reports. Deliberately blunt category names, not softened euphemisms — per your
direction that introverts value directness over euphemism (docs/PRD.md section 7.6,
docs/Glossary.md #7). Stored under the Circle so a moderator queue is one query.
"""

import uuid
import time
from app.db import get_table

REASONS = ("Harassment", "Doxxing attempt", "Spam", "Other")


def create_report(
    circle_id: str, target_type: str, target_id: str, post_id: str, reporter_id: str, reason: str, detail: str = ""
) -> dict:
    table = get_table()
    report_id = str(uuid.uuid4())
    created_at = int(time.time() * 1000)

    item = {
        "PK": f"CIRCLE#{circle_id}",
        "SK": f"REPORT#{created_at}#{report_id}",
        "report_id": report_id,
        "circle_id": circle_id,
        "target_type": target_type,  # "post" | "comment"
        "target_id": target_id,
        "post_id": post_id,  # for comments, the parent post; for posts, same as target_id
        "reporter_id": reporter_id,
        "reason": reason,
        "detail": detail,
        "status": "open",  # "open" | "resolved"
        "action_taken": None,
        "resolved_by": None,
        "resolved_at": None,
        "created_at": created_at,
    }
    table.put_item(Item=item)
    return item


def list_reports_for_circle(circle_id: str, status: str | None = None) -> list[dict]:
    table = get_table()
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"CIRCLE#{circle_id}", ":sk": "REPORT#"},
        ScanIndexForward=False,  # newest first
    )
    items = response.get("Items", [])
    if status:
        items = [i for i in items if i["status"] == status]
    return items


def get_report(circle_id: str, sk: str) -> dict | None:
    table = get_table()
    response = table.get_item(Key={"PK": f"CIRCLE#{circle_id}", "SK": sk})
    return response.get("Item")


def find_report_by_id(circle_id: str, report_id: str) -> dict | None:
    """Reports are keyed by SK=REPORT#<created_at>#<id>, but API consumers only know
    report_id. Cheap at Circle-queue scale (bounded, moderator-only traffic)."""
    for report in list_reports_for_circle(circle_id):
        if report["report_id"] == report_id:
            return report
    return None


def resolve_report(circle_id: str, sk: str, moderator_id: str, action: str) -> dict:
    table = get_table()
    response = table.update_item(
        Key={"PK": f"CIRCLE#{circle_id}", "SK": sk},
        UpdateExpression="SET #s = :resolved, action_taken = :action, resolved_by = :mod, resolved_at = :now",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":resolved": "resolved",
            ":action": action,
            ":mod": moderator_id,
            ":now": int(time.time() * 1000),
        },
        ReturnValues="ALL_NEW",
    )
    return response["Attributes"]
