"""
Moderation orchestration. Ties together reports, soft-deletion, bans, and the
moderator action log (docs/PRD.md section 7.6 — moderator roles from day one,
per your explicit instruction, not deferred to a later phase).
"""

import uuid
import time
from app.db import get_table
from app.models.post import get_post, remove_post, approve_post
from app.models.comment import get_comment, remove_comment
from app.models.ban import ban_user


class NotModeratorError(Exception):
    pass


class ReportNotFoundError(Exception):
    pass


class InvalidActionError(Exception):
    pass


VALID_ACTIONS = ("remove", "ban", "dismiss")


def require_moderator(circle: dict, user_id: str) -> None:
    if user_id not in circle.get("moderator_ids", []):
        raise NotModeratorError("Only Circle moderators can do this.")


def _write_mod_log(circle_id: str, moderator_id: str, action: str, target_type: str, target_id: str, note: str) -> None:
    table = get_table()
    log_id = str(uuid.uuid4())
    created_at = int(time.time() * 1000)
    table.put_item(
        Item={
            "PK": f"CIRCLE#{circle_id}",
            "SK": f"MODLOG#{created_at}#{log_id}",
            "log_id": log_id,
            "circle_id": circle_id,
            "moderator_id": moderator_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "note": note,
            "created_at": created_at,
        }
    )


def get_mod_log(circle_id: str) -> list[dict]:
    table = get_table()
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"CIRCLE#{circle_id}", ":sk": "MODLOG#"},
        ScanIndexForward=False,
    )
    return response.get("Items", [])


def resolve_report_with_action(circle: dict, report: dict, moderator_id: str, action: str) -> dict:
    """
    The single entry point the frontend's moderator queue calls. Performs the
    action (if any), marks the report resolved, and logs it — all in one call so
    the queue UI doesn't have to orchestrate multiple requests.

    DEFAULT DECISION (flagging, not asked): choosing "ban" also removes the specific
    reported content, since banning someone but leaving their reported post up is an
    unusual middle state. If you'd rather ban-without-removing be a separate choice,
    this is the one place to split it.
    """
    require_moderator(circle, moderator_id)

    if action not in VALID_ACTIONS:
        raise InvalidActionError(f"action must be one of {VALID_ACTIONS}")

    circle_id = circle["circle_id"]
    target_type = report["target_type"]
    target_id = report["target_id"]
    post_id = report["post_id"]

    if target_type == "post":
        target = get_post(circle_id, target_id)
    else:
        target = get_comment(post_id, target_id)

    if not target:
        raise ReportNotFoundError("The reported content no longer exists.")

    if action == "remove":
        if target_type == "post":
            remove_post(circle_id, target_id)
        else:
            remove_comment(post_id, target_id)

    elif action == "ban":
        ban_user(circle_id, target["author_id"], moderator_id, reason=f"Reported: {report['reason']}")
        if target_type == "post":
            remove_post(circle_id, target_id)
        else:
            remove_comment(post_id, target_id)

    # "dismiss" — no removal, but if this was an auto-flagged (Rekognition) post
    # sitting in held_for_review, dismissing the report is the moderator saying
    # "this is fine" — so it needs to actually become visible again, not just
    # have its report marked resolved while the post stays hidden forever.
    elif action == "dismiss" and target_type == "post" and target.get("held_for_review"):
        approve_post(circle_id, target_id)

    _write_mod_log(circle_id, moderator_id, action, target_type, target_id, note=report["reason"])

    from app.models.report import resolve_report

    return resolve_report(circle_id, report["SK"], moderator_id, action)
