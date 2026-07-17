from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.models.user import create_profile, get_profile, get_profile_by_name
from app.identity.name_generator import generate_anonymous_name
from app.services.tokens import list_tokens_for_user

identity_bp = Blueprint("identity", __name__, url_prefix="/api/identity")


@identity_bp.post("/generate-name")
def generate_name():
    """Matches web/app/api/generate-name/route.ts — swap the frontend to call this once deployed."""
    data = request.get_json(force=True)
    interests = data.get("interests", [])
    return jsonify({"name": generate_anonymous_name(interests)})


@identity_bp.post("")
@require_auth
def create():
    """Called at the end of onboarding (Phase 3 flow) to persist the Anonymous Identity."""
    data = request.get_json(force=True)
    user_id = g.user_id  # Cognito sub, from the verified JWT in production
    anonymous_name = data.get("anonymous_name")
    avatar_seed = data.get("avatar_seed", anonymous_name)
    interests = data.get("interests", [])

    if not user_id or not anonymous_name:
        return jsonify({"error": "user_id and anonymous_name are required"}), 400

    profile = create_profile(user_id, anonymous_name, avatar_seed, interests)
    return jsonify(profile), 201


@identity_bp.get("/<user_id>")
def get_one(user_id):
    profile = get_profile(user_id)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404
    return jsonify(profile)


@identity_bp.get("/by-name/<name>")
def get_by_name(name):
    profile = get_profile_by_name(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404
    return jsonify(profile)


@identity_bp.get("/<user_id>/tokens")
def get_tokens(user_id):
    return jsonify(list_tokens_for_user(user_id))
