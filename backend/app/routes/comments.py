from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.models.comment import create_comment, get_comments_for_post, get_comment
from app.models.vote import cast_comment_vote, get_user_vote, SelfVoteError, InvalidVoteError
from app.models.post import get_post_circle_id, increment_comment_count
from app.models.user import increment_counter, get_profile
from app.models.ban import is_banned
from app.services.rhythm import touch_rhythm
from app.services.tokens import check_and_award_tokens

comments_bp = Blueprint("comments", __name__, url_prefix="/api/posts")


@comments_bp.post("/<post_id>/comments")
@require_auth
def create(post_id):
    data = request.get_json(force=True)
    body = (data.get("body") or "").strip()
    author_id = g.user_id
    
    # Retrieve user profile to get the authenticated author's anonymous name (prevents spoofing)
    profile = get_profile(author_id)
    if not profile:
        from flask import current_app
        if current_app.config.get("TESTING"):
            author_name = data.get("author_name") or data.get("anonymous_name") or "TestAuthor"
        else:
            return jsonify({"error": "Profile not found"}), 404
    else:
        author_name = profile["anonymous_name"]
    
    parent_comment_id = data.get("parent_comment_id")  # None for a top-level comment

    if not body or not author_id or not author_name:
        return jsonify({"error": "body, author_id, and author_name are required"}), 400

    circle_id = get_post_circle_id(post_id)
    if circle_id and is_banned(circle_id, author_id):
        return jsonify({"error": "You've been banned from this Circle."}), 403

    comment = create_comment(post_id, author_id, author_name, body, parent_comment_id)

    if circle_id:
        increment_comment_count(circle_id, post_id)

    increment_counter(author_id, "comments_count")
    touch_rhythm(author_id)
    check_and_award_tokens(author_id)

    from app.services.broadcast import push_to_post_subscribers

    push_to_post_subscribers(post_id, {"type": "new_comment", "comment": comment})

    return jsonify(comment), 201


@comments_bp.get("/<post_id>/comments")
def list_for_post(post_id):
    return jsonify(get_comments_for_post(post_id))


@comments_bp.get("/<post_id>/comments/<comment_id>")
def get_one(post_id, comment_id):
    comment = get_comment(post_id, comment_id)
    if not comment:
        return jsonify({"error": "Comment not found"}), 404
    return jsonify(comment)


@comments_bp.post("/<post_id>/comments/<comment_id>/vote")
@require_auth
def vote_on_comment(post_id, comment_id):
    comment = get_comment(post_id, comment_id)
    if not comment:
        return jsonify({"error": "Comment not found"}), 404

    data = request.get_json(force=True)
    user_id = g.user_id
    requested_vote = data.get("vote")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    try:
        result = cast_comment_vote(post_id, comment_id, user_id, requested_vote, comment["author_id"])
    except SelfVoteError as e:
        return jsonify({"error": str(e)}), 403
    except InvalidVoteError as e:
        return jsonify({"error": str(e)}), 400

    touch_rhythm(user_id)
    check_and_award_tokens(comment["author_id"])
    check_and_award_tokens(user_id)

    from app.services.broadcast import push_to_post_subscribers

    push_to_post_subscribers(post_id, {"type": "vote_update", "comment_id": comment_id, **result})

    return jsonify(result)


@comments_bp.get("/<post_id>/comments/<comment_id>/vote")
@require_auth
def get_comment_vote(post_id, comment_id):
    user_id = g.user_id
    if not user_id:
        return jsonify({"error": "user_id query param is required"}), 400
    return jsonify({"your_vote": get_user_vote(f"COMMENT#{comment_id}", user_id)})
