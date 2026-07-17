"""
Phase 6 integration test — join Circles, aggregate a Home Feed, and the presigned
upload URL flow, all against mocked AWS (moto — no real calls, no charges).

Run with: python -m pytest backend/tests/test_phase6.py -v
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
def client():
    with mock_aws():
        import manage

        manage.create_table()
        manage.create_bucket()

        from app.main import create_app

        app = create_app()
        app.config["TESTING"] = True
        with app.test_client() as c:
            yield c


def test_join_circle_and_feed(client):
    circle_a = client.post("/api/circles", json={"name": "Book Nook", "creator_id": "u1"}).get_json()
    circle_b = client.post("/api/circles", json={"name": "Study & Focus", "creator_id": "u1"}).get_json()
    # A Circle the user does NOT join — must never appear in their feed
    client.post("/api/circles", json={"name": "Comfort Media", "creator_id": "u2"})

    join_resp = client.post(f"/api/circles/{circle_a['circle_id']}/join", json={"user_id": "u1"})
    assert join_resp.status_code == 201
    client.post(f"/api/circles/{circle_b['circle_id']}/join", json={"user_id": "u1"})

    joined = client.get("/api/users/u1/circles").get_json()
    assert set(joined) == {circle_a["circle_id"], circle_b["circle_id"]}

    client.post(
        f"/api/circles/{circle_a['circle_id']}/posts",
        json={"title": "From Book Nook", "author_id": "u1", "author_name": "QuietReader_1"},
    )
    client.post(
        f"/api/circles/{circle_b['circle_id']}/posts",
        json={"title": "From Study Circle", "author_id": "u1", "author_name": "QuietReader_1"},
    )

    feed = client.get("/api/users/u1/feed").get_json()
    titles = {p["title"] for p in feed}
    assert titles == {"From Book Nook", "From Study Circle"}


def test_leave_circle_removes_from_feed_source(client):
    circle = client.post("/api/circles", json={"name": "Late Night Thoughts", "creator_id": "u1"}).get_json()
    client.post(f"/api/circles/{circle['circle_id']}/join", json={"user_id": "u1"})
    assert client.get("/api/users/u1/circles").get_json() == [circle["circle_id"]]

    client.post(f"/api/circles/{circle['circle_id']}/leave", json={"user_id": "u1"})
    assert client.get("/api/users/u1/circles").get_json() == []


def test_presigned_upload_url_and_post_with_image(client):
    presign = client.post(
        "/api/uploads/presigned-url", json={"user_id": "u1", "content_type": "image/png"}
    ).get_json()
    assert presign["key"].startswith("posts/u1/")
    assert presign["key"].endswith(".png")
    assert presign["upload_url"].startswith("https://")

    circle = client.post("/api/circles", json={"name": "Art & Illustration", "creator_id": "u1"}).get_json()
    post = client.post(
        f"/api/circles/{circle['circle_id']}/posts",
        json={
            "title": "A sketch",
            "author_id": "u1",
            "author_name": "SoftSketcher_5",
            "image_key": presign["key"],
        },
    ).get_json()

    assert post["image_key"] == presign["key"]
    # The API should never leak the raw key as a browsable URL — only a presigned one
    assert "image_url" in post
    assert post["image_url"].startswith("https://")


def test_rejects_disallowed_content_type(client):
    resp = client.post("/api/uploads/presigned-url", json={"user_id": "u1", "content_type": "application/exe"})
    assert resp.status_code == 400
