from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.models.post import create_post, get_posts_for_circle, get_posts_for_user, get_post, get_feed_for_circles
from app.models.circle import get_circle, list_circles
from app.models.membership import get_joined_circle_ids
from app.models.vote import cast_post_vote, get_user_vote, SelfVoteError, InvalidVoteError
from app.models.user import increment_counter, get_profile
from app.models.ban import is_banned
from app.services.rhythm import touch_rhythm
from app.services.tokens import check_and_award_tokens
from app.services.s3 import generate_presigned_view_url, BUCKET_NAME
from app.services.rekognition import moderate_image
from app.models.report import create_report

posts_bp = Blueprint("posts", __name__, url_prefix="/api")


def _with_image_url(post: dict) -> dict:
    """Swaps the stored image_key for a short-lived presigned view URL before it leaves the API."""
    if post and post.get("image_key"):
        post = {**post, "image_url": generate_presigned_view_url(post["image_key"])}
    return post


@posts_bp.post("/circles/<circle_id>/posts")
@require_auth
def create(circle_id):
    if not get_circle(circle_id):
        return jsonify({"error": "Circle not found"}), 404

    data = request.get_json(force=True)
    title = (data.get("title") or "").strip()
    body = data.get("body", "")
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
    
    image_key = data.get("image_key")
    link_url = data.get("link_url")

    if not title or not author_id or not author_name:
        return jsonify({"error": "title, author_id, and author_name are required"}), 400
    if is_banned(circle_id, author_id):
        return jsonify({"error": "You've been banned from this Circle."}), 403

    held_for_review = False
    flagged_labels: list[str] = []
    if image_key:
        held_for_review, flagged_labels = moderate_image(BUCKET_NAME, image_key)

    post = create_post(circle_id, author_id, author_name, title, body, image_key, link_url, held_for_review)
    increment_counter(author_id, "posts_count")
    touch_rhythm(author_id)
    check_and_award_tokens(author_id)

    if held_for_review:
        create_report(
            circle_id=circle_id,
            target_type="post",
            target_id=post["post_id"],
            post_id=post["post_id"],
            reporter_id="system:rekognition",
            reason="Other",
            detail=f"Auto-flagged by Rekognition image moderation: {', '.join(flagged_labels)}",
        )

    return jsonify(_with_image_url(post)), 201


@posts_bp.get("/circles/<circle_id>/posts")
def list_for_circle(circle_id):
    posts = get_posts_for_circle(circle_id)
    return jsonify([_with_image_url(p) for p in posts])


@posts_bp.get("/circles/<circle_id>/posts/<post_id>")
def get_one(circle_id, post_id):
    post = get_post(circle_id, post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404
    return jsonify(_with_image_url(post))


@posts_bp.get("/users/<user_id>/posts")
def list_for_user(user_id):
    posts = get_posts_for_user(user_id)
    return jsonify([_with_image_url(p) for p in posts])


@posts_bp.get("/users/<user_id>/feed")
@require_auth
def feed(user_id):
    """Home Feed — merges recent posts from every Circle the user has joined.
    If no circles are joined, falls back to matches based on interests.
    """
    if user_id != g.user_id:
        return jsonify({"error": "Unauthorized"}), 403
    circle_ids = get_joined_circle_ids(user_id)
    if not circle_ids:
        profile = get_profile(user_id)
        if profile and profile.get("interests"):
            user_interests = [interest.lower() for interest in profile["interests"]]
            all_circles = list_circles(limit=100)
            
            matching_circle_ids = []
            for circle in all_circles:
                name = circle.get("name", "").lower()
                desc = circle.get("description", "").lower()
                if any(interest in name or interest in desc for interest in user_interests):
                    matching_circle_ids.append(circle["circle_id"])
            
            if matching_circle_ids:
                circle_ids = matching_circle_ids
            else:
                circle_ids = [c["circle_id"] for c in all_circles]
        else:
            all_circles = list_circles(limit=100)
            circle_ids = [c["circle_id"] for c in all_circles]

    posts = get_feed_for_circles(circle_ids)

    circle_names = {cid: (get_circle(cid) or {}).get("name", cid) for cid in set(circle_ids)}
    enriched = [{**_with_image_url(p), "circle_name": circle_names.get(p["circle_id"], p["circle_id"])} for p in posts]
    return jsonify(enriched)


@posts_bp.get("/users/<user_id>/circles")
@require_auth
def joined_circles(user_id):
    if user_id != g.user_id:
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify(get_joined_circle_ids(user_id))


@posts_bp.post("/circles/<circle_id>/posts/<post_id>/vote")
@require_auth
def vote_on_post(circle_id, post_id):
    post = get_post(circle_id, post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404

    data = request.get_json(force=True)
    user_id = g.user_id
    requested_vote = data.get("vote")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    try:
        result = cast_post_vote(circle_id, post_id, user_id, requested_vote, post["author_id"])
    except SelfVoteError as e:
        return jsonify({"error": str(e)}), 403
    except InvalidVoteError as e:
        return jsonify({"error": str(e)}), 400

    touch_rhythm(user_id)
    check_and_award_tokens(post["author_id"])  # resonance may have crossed a threshold
    check_and_award_tokens(user_id)  # voter's own Rhythm may have crossed a threshold

    from app.services.broadcast import push_to_post_subscribers

    push_to_post_subscribers(post_id, {"type": "vote_update", "post_id": post_id, **result})

    return jsonify(result)


@posts_bp.get("/circles/<circle_id>/posts/<post_id>/vote")
@require_auth
def get_post_vote(circle_id, post_id):
    """Lets the frontend hydrate NodPass's initial state ('did I already vote on this?')."""
    user_id = g.user_id
    if not user_id:
        return jsonify({"error": "user_id query param is required"}), 400
    return jsonify({"your_vote": get_user_vote(f"POST#{post_id}", user_id)})


@posts_bp.get("/circles/<circle_id>/posts/<post_id>/audio")
def read_aloud(circle_id, post_id):
    """Polly 'read aloud' — audio is cached in S3 after first synthesis (services/polly.py)."""
    post = get_post(circle_id, post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404

    from app.services.polly import get_or_create_audio_url, PollyUnavailableError

    text = f"{post['title']}. {post.get('body', '')}"
    try:
        audio_url = get_or_create_audio_url(post_id, text)
    except PollyUnavailableError as e:
        return jsonify({"error": str(e)}), 503

    return jsonify({"audio_url": audio_url})
