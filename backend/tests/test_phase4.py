"""
Phase 4 integration test — spins up a mocked DynamoDB table (moto, no real AWS calls)
and exercises the full Circle -> Post -> Comment flow through the real Flask routes.

Run with: python -m pytest backend/tests/test_phase4.py -v
"""

import os
import sys
import boto3
import pytest
from moto import mock_aws

os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_REGION", "ap-south-1")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "infra", "scripts"))


@pytest.fixture
def client():
    with mock_aws():
        import manage  # infra/scripts/manage.py — reuses the exact same table/GSI definition

        manage.create_table()

        from app.main import create_app

        app = create_app()
        app.config["TESTING"] = True
        with app.test_client() as c:
            yield c


def test_circle_creation_and_uniqueness(client):
    resp = client.post("/api/circles", json={"name": "Book Nook", "description": "For readers", "creator_id": "u1"})
    assert resp.status_code == 201
    circle = resp.get_json()
    assert circle["name"] == "Book Nook"

    # Duplicate name (even different case) must be rejected atomically
    dupe = client.post("/api/circles", json={"name": "book nook", "description": "sneaky", "creator_id": "u2"})
    assert dupe.status_code == 409


def test_full_post_and_comment_flow(client):
    circle = client.post("/api/circles", json={"name": "Quiet Hobbies", "creator_id": "u1"}).get_json()
    circle_id = circle["circle_id"]

    post = client.post(
        f"/api/circles/{circle_id}/posts",
        json={"title": "Anyone else knit at 2am?", "body": "Just me?", "author_id": "u1", "author_name": "QuietKnitter_12"},
    ).get_json()
    assert post["title"] == "Anyone else knit at 2am?"
    assert post["nod_count"] == 0

    posts = client.get(f"/api/circles/{circle_id}/posts").get_json()
    assert len(posts) == 1

    top_comment = client.post(
        f"/api/posts/{post['post_id']}/comments",
        json={"body": "same", "author_id": "u2", "author_name": "SlowMorning_19"},
    ).get_json()
    assert top_comment["parent_comment_id"] is None

    reply = client.post(
        f"/api/posts/{post['post_id']}/comments",
        json={
            "body": "glad it's not just me",
            "author_id": "u1",
            "author_name": "QuietKnitter_12",
            "parent_comment_id": top_comment["comment_id"],
        },
    ).get_json()
    assert reply["parent_comment_id"] == top_comment["comment_id"]

    comments = client.get(f"/api/posts/{post['post_id']}/comments").get_json()
    assert len(comments) == 2


def test_identity_profile_roundtrip(client):
    created = client.post(
        "/api/identity",
        json={"user_id": "cognito-sub-123", "anonymous_name": "MutedTinkerer_98", "interests": ["coding"]},
    )
    assert created.status_code == 201

    fetched = client.get("/api/identity/cognito-sub-123").get_json()
    assert fetched["anonymous_name"] == "MutedTinkerer_98"
    assert fetched["resonance_score"] == 0
