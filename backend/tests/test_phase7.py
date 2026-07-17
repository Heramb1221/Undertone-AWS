"""
Phase 7 integration test — Nod/Pass voting, resonance propagation, self-vote
prevention, and toggle/switch behavior, against mocked AWS (moto).

Run with: python -m pytest backend/tests/test_phase7.py -v
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
def setup(client_factory=None):
    with mock_aws():
        import manage

        manage.create_table()
        manage.create_bucket()

        from app.main import create_app

        app = create_app()
        app.config["TESTING"] = True
        with app.test_client() as c:
            # Author creates an identity, a Circle, and a post to be voted on
            c.post("/api/identity", json={"user_id": "author1", "anonymous_name": "SoftKnitter_12", "interests": []})
            circle = c.post("/api/circles", json={"name": "Quiet Hobbies", "creator_id": "author1"}).get_json()
            post = c.post(
                f"/api/circles/{circle['circle_id']}/posts",
                json={"title": "2am scarf", "author_id": "author1", "author_name": "SoftKnitter_12"},
            ).get_json()
            yield c, circle, post


def test_nod_increments_count_and_resonance(setup):
    client, circle, post = setup
    resp = client.post(
        f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/vote",
        json={"user_id": "voter1", "vote": "nod"},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body == {"nod_count": 1, "pass_count": 0, "your_vote": "nod"}

    profile = client.get("/api/identity/author1").get_json()
    assert profile["resonance_score"] == 1


def test_clicking_nod_twice_toggles_it_off(setup):
    client, circle, post = setup
    url = f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/vote"

    client.post(url, json={"user_id": "voter1", "vote": "nod"})
    resp = client.post(url, json={"user_id": "voter1", "vote": "nod"})
    body = resp.get_json()
    assert body == {"nod_count": 0, "pass_count": 0, "your_vote": None}

    profile = client.get("/api/identity/author1").get_json()
    assert profile["resonance_score"] == 0


def test_switching_from_nod_to_pass(setup):
    client, circle, post = setup
    url = f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/vote"

    client.post(url, json={"user_id": "voter1", "vote": "nod"})
    resp = client.post(url, json={"user_id": "voter1", "vote": "pass"})
    body = resp.get_json()
    assert body == {"nod_count": 0, "pass_count": 1, "your_vote": "pass"}

    profile = client.get("/api/identity/author1").get_json()
    assert profile["resonance_score"] == -1


def test_self_vote_rejected(setup):
    client, circle, post = setup
    resp = client.post(
        f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/vote",
        json={"user_id": "author1", "vote": "nod"},
    )
    assert resp.status_code == 403


def test_invalid_vote_value_rejected(setup):
    client, circle, post = setup
    resp = client.post(
        f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/vote",
        json={"user_id": "voter1", "vote": "shrug"},
    )
    assert resp.status_code == 400


def test_multiple_voters_dont_clobber_each_other(setup):
    client, circle, post = setup
    url = f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/vote"

    client.post(url, json={"user_id": "voter1", "vote": "nod"})
    client.post(url, json={"user_id": "voter2", "vote": "nod"})
    resp = client.post(url, json={"user_id": "voter3", "vote": "pass"})
    body = resp.get_json()
    assert body["nod_count"] == 2
    assert body["pass_count"] == 1

    profile = client.get("/api/identity/author1").get_json()
    assert profile["resonance_score"] == 1  # +1 +1 -1


def test_comment_voting_and_resonance(setup):
    client, circle, post = setup
    client.post("/api/identity", json={"user_id": "commenter1", "anonymous_name": "SlowMorning_19", "interests": []})
    comment = client.post(
        f"/api/posts/{post['post_id']}/comments",
        json={"body": "same", "author_id": "commenter1", "author_name": "SlowMorning_19"},
    ).get_json()

    resp = client.post(
        f"/api/posts/{post['post_id']}/comments/{comment['comment_id']}/vote",
        json={"user_id": "voter1", "vote": "nod"},
    )
    assert resp.get_json() == {"nod_count": 1, "pass_count": 0, "your_vote": "nod"}

    commenter_profile = client.get("/api/identity/commenter1").get_json()
    assert commenter_profile["resonance_score"] == 1
    # Post author's resonance must be untouched by a vote on someone else's comment
    author_profile = client.get("/api/identity/author1").get_json()
    assert author_profile["resonance_score"] == 0


def test_get_vote_hydrates_current_state(setup):
    client, circle, post = setup
    url = f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/vote"

    assert client.get(f"{url}?user_id=voter1").get_json() == {"your_vote": None}
    client.post(url, json={"user_id": "voter1", "vote": "pass"})
    assert client.get(f"{url}?user_id=voter1").get_json() == {"your_vote": "pass"}
