from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.models.dm import (
    send_message,
    get_conversation,
    list_conversations_for_user,
    block_user,
    unblock_user,
    is_blocked,
    BlockedError,
)
from app.services.rhythm import touch_rhythm

dm_bp = Blueprint("dm", __name__, url_prefix="/api/dm")


@dm_bp.post("/send")
@require_auth
def send():
    data = request.get_json(force=True)
    sender_id = g.user_id
    recipient_id = data.get("recipient_id")
    body = (data.get("body") or "").strip()

    if not sender_id or not recipient_id or not body:
        return jsonify({"error": "sender_id, recipient_id, and body are required"}), 400
    if sender_id == recipient_id:
        return jsonify({"error": "You can't message yourself."}), 400

    try:
        message = send_message(sender_id, recipient_id, body)
    except BlockedError as e:
        return jsonify({"error": str(e)}), 403

    touch_rhythm(sender_id)

    # Real-time push attempt — silently no-ops if the WebSocket layer isn't
    # deployed/configured (e.g. local dev, or this sandbox). See services/broadcast.py.
    from app.services.broadcast import push_to_user

    push_to_user(recipient_id, {"type": "dm", "message": message})

    # Push NOTIFICATION (Expo) — separate from the WebSocket push above. Reaches
    # the recipient even if they're not actively connected/looking at the app.
    from app.services.push import send_push_notification

    send_push_notification(recipient_id, title="New message", body=f"{sender_id}: {body[:80]}", data={"conversation_id": message["conversation_id"]})

    return jsonify(message), 201


@dm_bp.get("/conversation/<other_user_id>")
@require_auth
def conversation(other_user_id):
    user_id = g.user_id
    return jsonify(get_conversation(user_id, other_user_id))


@dm_bp.get("/inbox")
@require_auth
def inbox():
    user_id = g.user_id
    
    convs = list_conversations_for_user(user_id)
    from app.models.user import get_profile
    enriched = []
    for c in convs:
        c_copy = dict(c)
        other_prof = get_profile(c["other_user_id"])
        if other_prof:
            c_copy["other_anonymous_name"] = other_prof.get("anonymous_name")
        else:
            c_copy["other_anonymous_name"] = c["other_user_id"]
        enriched.append(c_copy)
        
    return jsonify(enriched)


@dm_bp.post("/block")
@require_auth
def block():
    data = request.get_json(force=True)
    user_id = g.user_id
    blocked_user_id = data.get("blocked_user_id")
    if not user_id or not blocked_user_id:
        return jsonify({"error": "user_id and blocked_user_id are required"}), 400
    block_user(user_id, blocked_user_id)
    return jsonify({"blocked": True}), 201


@dm_bp.post("/unblock")
@require_auth
def unblock():
    data = request.get_json(force=True)
    user_id = g.user_id
    blocked_user_id = data.get("blocked_user_id")
    if not user_id or not blocked_user_id:
        return jsonify({"error": "user_id and blocked_user_id are required"}), 400
    unblock_user(user_id, blocked_user_id)
    return jsonify({"blocked": False})


@dm_bp.get("/blocked-status/<other_user_id>")
@require_auth
def blocked_status(other_user_id):
    user_id = g.user_id
    return jsonify({"blocked": is_blocked(user_id, other_user_id)})
