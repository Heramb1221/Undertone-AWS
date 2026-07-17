from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.models.push_token import save_push_token

push_bp = Blueprint("push", __name__, url_prefix="/api/push")


@push_bp.post("/register")
@require_auth
def register_push_token():
    data = request.get_json(force=True)
    user_id = g.user_id
    token = data.get("token")
    platform = data.get("platform", "expo")
    if not user_id or not token:
        return jsonify({"error": "user_id and token are required"}), 400
    save_push_token(user_id, token, platform)
    return jsonify({"registered": True}), 201
