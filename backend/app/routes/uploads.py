from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.services.s3 import generate_upload_key, generate_presigned_upload_url

uploads_bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@uploads_bp.post("/presigned-url")
@require_auth
def presigned_url():
    """
    Frontend flow: call this first, PUT the file directly to `upload_url` from the
    browser (never through our backend), then send `key` when creating the post.
    Keeps large file bytes off our Flask/ECS compute entirely.
    """
    data = request.get_json(force=True)
    user_id = g.user_id
    content_type = data.get("content_type")

    if not user_id or content_type not in ALLOWED_CONTENT_TYPES:
        return jsonify({"error": f"user_id required; content_type must be one of {sorted(ALLOWED_CONTENT_TYPES)}"}), 400

    key = generate_upload_key(user_id, content_type)
    upload_url = generate_presigned_upload_url(key, content_type)
    return jsonify({"upload_url": upload_url, "key": key})
