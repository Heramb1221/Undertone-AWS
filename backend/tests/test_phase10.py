"""
Phase 10 integration test — reporting, moderator-only authorization, remove/ban/
dismiss actions, the mod log, and ban enforcement at join/post/comment time.

Run with: python -m pytest backend/tests/test_phase10.py -v
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
            circle = c.post("/api/circles", json={"name": "Book Nook", "creator_id": "mod1"}).get_json()
            post = c.post(
                f"/api/circles/{circle['circle_id']}/posts",
                json={"title": "spammy post", "author_id": "troll1", "author_name": "Troll_1"},
            ).get_json()
            yield c, circle, post


def test_create_report_requires_valid_reason(setup):
    client, circle, post = setup
    bad = client.post(
        f"/api/circles/{circle['circle_id']}/reports",
        json={
            "reporter_id": "u2", "target_type": "post", "target_id": post["post_id"],
            "post_id": post["post_id"], "reason": "I just don't like it",
        },
    )
    assert bad.status_code == 400

    good = client.post(
        f"/api/circles/{circle['circle_id']}/reports",
        json={
            "reporter_id": "u2", "target_type": "post", "target_id": post["post_id"],
            "post_id": post["post_id"], "reason": "Spam",
        },
    )
    assert good.status_code == 201
    assert good.get_json()["status"] == "open"


def test_non_moderator_cannot_view_queue(setup):
    client, circle, post = setup
    resp = client.get(f"/api/circles/{circle['circle_id']}/reports?moderator_id=troll1")
    assert resp.status_code == 403


def test_moderator_can_view_queue(setup):
    client, circle, post = setup
    client.post(
        f"/api/circles/{circle['circle_id']}/reports",
        json={"reporter_id": "u2", "target_type": "post", "target_id": post["post_id"], "post_id": post["post_id"], "reason": "Spam"},
    )
    resp = client.get(f"/api/circles/{circle['circle_id']}/reports?moderator_id=mod1")
    assert resp.status_code == 200
    assert len(resp.get_json()) == 1


def test_remove_action_soft_deletes_post(setup, make_token):
    client, circle, post = setup
    report = client.post(
        f"/api/circles/{circle['circle_id']}/reports",
        json={"reporter_id": "u2", "target_type": "post", "target_id": post["post_id"], "post_id": post["post_id"], "reason": "Spam"},
    ).get_json()

    resolve = client.post(
        f"/api/circles/{circle['circle_id']}/reports/{report['report_id']}/resolve",
        json={"action": "remove"},
        headers={"Authorization": f"Bearer {make_token('mod1')}"},
    )
    assert resolve.status_code == 200
    assert resolve.get_json()["status"] == "resolved"
    assert resolve.get_json()["action_taken"] == "remove"

    visible_posts = client.get(f"/api/circles/{circle['circle_id']}/posts").get_json()
    assert all(p["post_id"] != post["post_id"] for p in visible_posts)

    still_exists = client.get(f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}").get_json()
    assert still_exists["removed"] is True


def test_ban_action_bans_author_and_removes_content(setup, make_token):
    client, circle, post = setup
    report = client.post(
        f"/api/circles/{circle['circle_id']}/reports",
        json={"reporter_id": "u2", "target_type": "post", "target_id": post["post_id"], "post_id": post["post_id"], "reason": "Harassment"},
    ).get_json()

    resolve = client.post(
        f"/api/circles/{circle['circle_id']}/reports/{report['report_id']}/resolve",
        json={"action": "ban"},
        headers={"Authorization": f"Bearer {make_token('mod1')}"},
    )
    assert resolve.get_json()["action_taken"] == "ban"

    visible_posts = client.get(f"/api/circles/{circle['circle_id']}/posts").get_json()
    assert all(p["post_id"] != post["post_id"] for p in visible_posts)

    join_resp = client.post(f"/api/circles/{circle['circle_id']}/join", json={"user_id": "troll1"})
    assert join_resp.status_code == 403

    post_resp = client.post(
        f"/api/circles/{circle['circle_id']}/posts",
        json={"title": "another attempt", "author_id": "troll1", "author_name": "Troll_1"},
    )
    assert post_resp.status_code == 403

    other_post = client.post(
        f"/api/circles/{circle['circle_id']}/posts",
        json={"title": "legit post", "author_id": "mod1", "author_name": "Mod_1"},
    ).get_json()
    comment_resp = client.post(
        f"/api/posts/{other_post['post_id']}/comments",
        json={"body": "sneaking in", "author_id": "troll1", "author_name": "Troll_1"},
    )
    assert comment_resp.status_code == 403


def test_dismiss_action_leaves_content_untouched(setup, make_token):
    client, circle, post = setup
    report = client.post(
        f"/api/circles/{circle['circle_id']}/reports",
        json={"reporter_id": "u2", "target_type": "post", "target_id": post["post_id"], "post_id": post["post_id"], "reason": "Other"},
    ).get_json()

    resolve = client.post(
        f"/api/circles/{circle['circle_id']}/reports/{report['report_id']}/resolve",
        json={"action": "dismiss"},
        headers={"Authorization": f"Bearer {make_token('mod1')}"},
    )
    assert resolve.get_json()["status"] == "resolved"
    assert resolve.get_json()["action_taken"] == "dismiss"

    visible_posts = client.get(f"/api/circles/{circle['circle_id']}/posts").get_json()
    assert any(p["post_id"] == post["post_id"] for p in visible_posts)


def test_non_moderator_cannot_resolve_report(setup, make_token):
    client, circle, post = setup
    report = client.post(
        f"/api/circles/{circle['circle_id']}/reports",
        json={"reporter_id": "u2", "target_type": "post", "target_id": post["post_id"], "post_id": post["post_id"], "reason": "Spam"},
    ).get_json()

    resolve = client.post(
        f"/api/circles/{circle['circle_id']}/reports/{report['report_id']}/resolve",
        json={"action": "remove"},
        headers={"Authorization": f"Bearer {make_token('troll1')}"},
    )
    assert resolve.status_code == 403

    visible_posts = client.get(f"/api/circles/{circle['circle_id']}/posts").get_json()
    assert any(p["post_id"] == post["post_id"] for p in visible_posts)


def test_mod_log_records_the_action(setup, make_token):
    client, circle, post = setup
    report = client.post(
        f"/api/circles/{circle['circle_id']}/reports",
        json={"reporter_id": "u2", "target_type": "post", "target_id": post["post_id"], "post_id": post["post_id"], "reason": "Spam"},
    ).get_json()
    client.post(
        f"/api/circles/{circle['circle_id']}/reports/{report['report_id']}/resolve",
        json={"action": "remove"},
        headers={"Authorization": f"Bearer {make_token('mod1')}"},
    )

    log_resp = client.get(f"/api/circles/{circle['circle_id']}/moderation/log?moderator_id=mod1")
    assert log_resp.status_code == 200
    entries = log_resp.get_json()
    assert len(entries) == 1
    assert entries[0]["action"] == "remove"
    assert entries[0]["moderator_id"] == "mod1"


def test_removed_comment_hidden_but_recoverable(setup, make_token):
    client, circle, post = setup
    comment = client.post(
        f"/api/posts/{post['post_id']}/comments",
        json={"body": "rude comment", "author_id": "troll1", "author_name": "Troll_1"},
    ).get_json()

    report = client.post(
        f"/api/circles/{circle['circle_id']}/reports",
        json={
            "reporter_id": "u2", "target_type": "comment", "target_id": comment["comment_id"],
            "post_id": post["post_id"], "reason": "Harassment",
        },
    ).get_json()

    client.post(
        f"/api/circles/{circle['circle_id']}/reports/{report['report_id']}/resolve",
        json={"action": "remove"},
        headers={"Authorization": f"Bearer {make_token('mod1')}"},
    )

    visible_comments = client.get(f"/api/posts/{post['post_id']}/comments").get_json()
    assert all(c["comment_id"] != comment["comment_id"] for c in visible_comments)
