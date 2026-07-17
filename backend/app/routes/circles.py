from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.models.circle import create_circle, list_circles, get_circle, CircleNameTakenError
from app.models.membership import join_circle, leave_circle, get_joined_circle_ids
from app.models.user import increment_counter
from app.models.ban import is_banned
from app.services.rhythm import touch_rhythm
from app.services.tokens import check_and_award_tokens
from app.models.report import create_report, list_reports_for_circle, find_report_by_id, REASONS
from app.services.moderation import (
    resolve_report_with_action,
    get_mod_log,
    require_moderator,
    NotModeratorError,
    ReportNotFoundError,
    InvalidActionError,
)

circles_bp = Blueprint("circles", __name__, url_prefix="/api/circles")


@circles_bp.post("")
@require_auth
def create():
    data = request.get_json(force=True)
    name = (data.get("name") or "").strip()
    description = data.get("description", "")
    creator_id = g.user_id

    if not name or not creator_id:
        return jsonify({"error": "name and creator_id are required"}), 400

    try:
        circle = create_circle(name, description, creator_id)
    except CircleNameTakenError as e:
        return jsonify({"error": str(e)}), 409

    increment_counter(creator_id, "circles_created_count")
    touch_rhythm(creator_id)
    check_and_award_tokens(creator_id)

    return jsonify(circle), 201


@circles_bp.get("")
def list_all():
    return jsonify(list_circles())


@circles_bp.get("/<circle_id>")
def get_one(circle_id):
    circle = get_circle(circle_id)
    if not circle:
        return jsonify({"error": "Circle not found"}), 404
    return jsonify(circle)


@circles_bp.post("/<circle_id>/join")
@require_auth
def join(circle_id):
    if not get_circle(circle_id):
        return jsonify({"error": "Circle not found"}), 404
    data = request.get_json(force=True)
    user_id = g.user_id
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    if is_banned(circle_id, user_id):
        return jsonify({"error": "You've been banned from this Circle."}), 403

    join_circle(user_id, circle_id)
    touch_rhythm(user_id)
    check_and_award_tokens(user_id)
    return jsonify({"joined": True}), 201


@circles_bp.post("/<circle_id>/leave")
@require_auth
def leave(circle_id):
    data = request.get_json(force=True)
    user_id = g.user_id
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    leave_circle(user_id, circle_id)
    return jsonify({"joined": False})


@circles_bp.post("/<circle_id>/reports")
@require_auth
def report(circle_id):
    if not get_circle(circle_id):
        return jsonify({"error": "Circle not found"}), 404

    data = request.get_json(force=True)
    reporter_id = g.user_id
    target_type = data.get("target_type")
    target_id = data.get("target_id")
    post_id = data.get("post_id")
    reason = data.get("reason")
    detail = data.get("detail", "")

    if not all([reporter_id, target_type, target_id, post_id, reason]):
        return jsonify({"error": "reporter_id, target_type, target_id, post_id, and reason are required"}), 400
    if target_type not in ("post", "comment"):
        return jsonify({"error": "target_type must be 'post' or 'comment'"}), 400
    if reason not in REASONS:
        return jsonify({"error": f"reason must be one of {REASONS}"}), 400

    report_item = create_report(circle_id, target_type, target_id, post_id, reporter_id, reason, detail)
    return jsonify(report_item), 201


@circles_bp.get("/<circle_id>/reports")
@require_auth
def list_reports(circle_id):
    circle = get_circle(circle_id)
    if not circle:
        return jsonify({"error": "Circle not found"}), 404

    moderator_id = g.user_id
    try:
        require_moderator(circle, moderator_id)
    except NotModeratorError as e:
        return jsonify({"error": str(e)}), 403

    status = request.args.get("status")  # "open" | "resolved" | None (all)
    return jsonify(list_reports_for_circle(circle_id, status))


@circles_bp.post("/<circle_id>/reports/<report_id>/resolve")
@require_auth
def resolve_report_route(circle_id, report_id):
    """
    The first (and, as of Phase 20, only) endpoint protected by real Cognito
    JWT verification instead of trusting a client-supplied id — moderator
    actions are the single highest-privilege operation in the app (they can
    ban users and delete content), so this was the priority for the
    time available. See README.md's Phase 20 section for the full,
    honest list of what's still unprotected.
    """
    circle = get_circle(circle_id)
    if not circle:
        return jsonify({"error": "Circle not found"}), 404

    data = request.get_json(force=True)
    moderator_id = g.user_id  # verified by @require_auth — NOT trusted from the request body anymore
    action = data.get("action")

    report_item = find_report_by_id(circle_id, report_id)
    if not report_item:
        return jsonify({"error": "Report not found"}), 404

    try:
        updated = resolve_report_with_action(circle, report_item, moderator_id, action)
    except NotModeratorError as e:
        return jsonify({"error": str(e)}), 403
    except InvalidActionError as e:
        return jsonify({"error": str(e)}), 400
    except ReportNotFoundError as e:
        return jsonify({"error": str(e)}), 404

    return jsonify(updated)


@circles_bp.get("/<circle_id>/moderation/log")
@require_auth
def moderation_log(circle_id):
    circle = get_circle(circle_id)
    if not circle:
        return jsonify({"error": "Circle not found"}), 404

    moderator_id = g.user_id
    try:
        require_moderator(circle, moderator_id)
    except NotModeratorError as e:
        return jsonify({"error": str(e)}), 403

    return jsonify(get_mod_log(circle_id))
