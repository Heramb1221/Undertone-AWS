"""
Phase 8 integration test — comment_count propagation to the parent post, and that
deep nested reply chains store correct parent_comment_id links, against mocked AWS.

Run with: python -m pytest backend/tests/test_phase8.py -v
"""

import os
import sys
import pytest
from moto import mock_aws

os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_REGION", "ap-south-1")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "infra", "scripts"))


@pytest.fixture
def setup():
    with mock_aws():
        import manage

        manage.create_table()
        manage.create_bucket()

        from app.main import create_app

        app = create_app()
        app.config["TESTING"] = True
        with app.test_client() as c:
            circle = c.post("/api/circles", json={"name": "Late Night Thoughts", "creator_id": "u1"}).get_json()
            post = c.post(
                f"/api/circles/{circle['circle_id']}/posts",
                json={"title": "Can't sleep again", "author_id": "u1", "author_name": "QuietThinker_1"},
            ).get_json()
            yield c, circle, post


def test_comment_count_increments_on_post(setup):
    client, circle, post = setup
    post_id = post["post_id"]
    circle_id = circle["circle_id"]

    assert client.get(f"/api/circles/{circle_id}/posts/{post_id}").get_json()["comment_count"] == 0

    client.post(f"/api/posts/{post_id}/comments", json={"body": "same", "author_id": "u2", "author_name": "SlowMorning_19"})
    client.post(f"/api/posts/{post_id}/comments", json={"body": "me too", "author_id": "u3", "author_name": "CalmReader_69"})

    updated = client.get(f"/api/circles/{circle_id}/posts/{post_id}").get_json()
    assert updated["comment_count"] == 2


def test_deep_nested_reply_chain(setup):
    client, circle, post = setup
    post_id = post["post_id"]

    c1 = client.post(
        f"/api/posts/{post_id}/comments", json={"body": "level 1", "author_id": "u2", "author_name": "A"}
    ).get_json()
    c2 = client.post(
        f"/api/posts/{post_id}/comments",
        json={"body": "level 2", "author_id": "u3", "author_name": "B", "parent_comment_id": c1["comment_id"]},
    ).get_json()
    c3 = client.post(
        f"/api/posts/{post_id}/comments",
        json={"body": "level 3", "author_id": "u4", "author_name": "C", "parent_comment_id": c2["comment_id"]},
    ).get_json()
    c4 = client.post(
        f"/api/posts/{post_id}/comments",
        json={"body": "level 4 (past the visual collapse depth)", "author_id": "u5", "author_name": "D", "parent_comment_id": c3["comment_id"]},
    ).get_json()

    all_comments = client.get(f"/api/posts/{post_id}/comments").get_json()
    assert len(all_comments) == 4

    by_id = {c["comment_id"]: c for c in all_comments}
    assert by_id[c2["comment_id"]]["parent_comment_id"] == c1["comment_id"]
    assert by_id[c3["comment_id"]]["parent_comment_id"] == c2["comment_id"]
    assert by_id[c4["comment_id"]]["parent_comment_id"] == c3["comment_id"]

    # Comments come back sorted chronologically, which is what the client needs
    # to reconstruct the tree correctly regardless of nesting depth.
    assert [c["comment_id"] for c in all_comments] == [
        c1["comment_id"], c2["comment_id"], c3["comment_id"], c4["comment_id"]
    ]

    # Comment count on the post reflects ALL nested replies, not just top-level ones
    updated_post = client.get(f"/api/circles/{circle['circle_id']}/posts/{post_id}").get_json()
    assert updated_post["comment_count"] == 4


def test_comment_lookup_by_id_works_for_voting(setup):
    """Regression check for the Phase 7 comment-key refactor — get_comment must work
    for votes to attach to the right item."""
    client, circle, post = setup
    comment = client.post(
        f"/api/posts/{post['post_id']}/comments", json={"body": "vote on me", "author_id": "u2", "author_name": "A"}
    ).get_json()

    vote_resp = client.post(
        f"/api/posts/{post['post_id']}/comments/{comment['comment_id']}/vote",
        json={"user_id": "u3", "vote": "nod"},
    )
    assert vote_resp.status_code == 200
    assert vote_resp.get_json()["nod_count"] == 1
