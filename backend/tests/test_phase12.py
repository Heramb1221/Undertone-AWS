"""
Phase 12 tests. DynamoDB and S3 run against moto (real mock coverage). Rekognition
and Polly are NOT well-covered by moto, and there's no network path to the real
services from this sandbox — so those two clients are replaced with
unittest.mock objects returning controlled responses. This tests OUR gating,
caching, and moderation-integration logic thoroughly; it does not and cannot
test whether the real Rekognition/Polly APIs behave as documented.

Run with: python -m pytest backend/tests/test_phase12.py -v
"""

import os
import sys
import io
import pytest
from unittest.mock import patch, MagicMock
from moto import mock_aws

os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_REGION", "ap-south-1")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "infra", "scripts"))


@pytest.fixture
def app_client():
    with mock_aws():
        import manage

        manage.create_table()
        manage.create_bucket()

        from app.main import create_app

        app = create_app()
        app.config["TESTING"] = True
        with app.test_client() as c:
            yield c


# ---------- Rekognition ----------

def test_clean_image_does_not_flag_post(app_client):
    with patch("app.services.rekognition._get_client") as mock_get_client:
        mock_get_client.return_value.detect_moderation_labels.return_value = {"ModerationLabels": []}

        circle = app_client.post("/api/circles", json={"name": "Art", "creator_id": "u1"}).get_json()
        post = app_client.post(
            f"/api/circles/{circle['circle_id']}/posts",
            json={"title": "my sketch", "author_id": "u1", "author_name": "A", "image_key": "posts/u1/abc.png"},
        ).get_json()

        assert post["held_for_review"] is False
        visible = app_client.get(f"/api/circles/{circle['circle_id']}/posts").get_json()
        assert any(p["post_id"] == post["post_id"] for p in visible)


def test_flagged_image_holds_post_and_creates_report(app_client):
    with patch("app.services.rekognition._get_client") as mock_get_client:
        mock_get_client.return_value.detect_moderation_labels.return_value = {
            "ModerationLabels": [{"Name": "Explicit Nudity", "Confidence": 97.0}]
        }

        circle = app_client.post("/api/circles", json={"name": "Art", "creator_id": "u1"}).get_json()
        post = app_client.post(
            f"/api/circles/{circle['circle_id']}/posts",
            json={"title": "sketch", "author_id": "u1", "author_name": "A", "image_key": "posts/u1/bad.png"},
        ).get_json()

        assert post["held_for_review"] is True

        # Hidden from the public listing...
        visible = app_client.get(f"/api/circles/{circle['circle_id']}/posts").get_json()
        assert all(p["post_id"] != post["post_id"] for p in visible)

        # ...but a system-generated report exists for moderators
        reports = app_client.get(f"/api/circles/{circle['circle_id']}/reports?moderator_id=u1").get_json()
        assert len(reports) == 1
        assert reports[0]["reporter_id"] == "system:rekognition"
        assert "Explicit Nudity" in reports[0]["detail"]


def test_moderator_dismiss_on_flagged_post_makes_it_visible_again(app_client, make_token):
    with patch("app.services.rekognition._get_client") as mock_get_client:
        mock_get_client.return_value.detect_moderation_labels.return_value = {
            "ModerationLabels": [{"Name": "Violence", "Confidence": 90.0}]
        }
        circle = app_client.post("/api/circles", json={"name": "Art", "creator_id": "u1"}).get_json()
        post = app_client.post(
            f"/api/circles/{circle['circle_id']}/posts",
            json={"title": "sketch", "author_id": "u1", "author_name": "A", "image_key": "posts/u1/x.png"},
        ).get_json()

    report = app_client.get(f"/api/circles/{circle['circle_id']}/reports?moderator_id=u1").get_json()[0]
    app_client.post(
        f"/api/circles/{circle['circle_id']}/reports/{report['report_id']}/resolve",
        json={"action": "dismiss"},
        headers={"Authorization": f"Bearer {make_token('u1')}"},
    )

    visible = app_client.get(f"/api/circles/{circle['circle_id']}/posts").get_json()
    assert any(p["post_id"] == post["post_id"] for p in visible)


def test_moderator_remove_on_flagged_post_stays_hidden(app_client, make_token):
    with patch("app.services.rekognition._get_client") as mock_get_client:
        mock_get_client.return_value.detect_moderation_labels.return_value = {
            "ModerationLabels": [{"Name": "Violence", "Confidence": 90.0}]
        }
        circle = app_client.post("/api/circles", json={"name": "Art", "creator_id": "u1"}).get_json()
        post = app_client.post(
            f"/api/circles/{circle['circle_id']}/posts",
            json={"title": "sketch", "author_id": "u1", "author_name": "A", "image_key": "posts/u1/x.png"},
        ).get_json()

    report = app_client.get(f"/api/circles/{circle['circle_id']}/reports?moderator_id=u1").get_json()[0]
    app_client.post(
        f"/api/circles/{circle['circle_id']}/reports/{report['report_id']}/resolve",
        json={"action": "remove"},
        headers={"Authorization": f"Bearer {make_token('u1')}"},
    )

    visible = app_client.get(f"/api/circles/{circle['circle_id']}/posts").get_json()
    assert all(p["post_id"] != post["post_id"] for p in visible)
    full = app_client.get(f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}").get_json()
    assert full["removed"] is True
    assert full["held_for_review"] is False  # cleared, not left in a confusing double-state


def test_rekognition_fails_open_over_budget(app_client):
    with patch("app.services.rekognition.get_usage_count", return_value=999999):
        with patch("app.services.rekognition._get_client") as mock_get_client:
            circle = app_client.post("/api/circles", json={"name": "Art", "creator_id": "u1"}).get_json()
            post = app_client.post(
                f"/api/circles/{circle['circle_id']}/posts",
                json={"title": "sketch", "author_id": "u1", "author_name": "A", "image_key": "posts/u1/x.png"},
            ).get_json()

            assert post["held_for_review"] is False
            mock_get_client.return_value.detect_moderation_labels.assert_not_called()  # never even called — budget check short-circuits


def test_rekognition_fails_open_on_api_error(app_client):
    with patch("app.services.rekognition._get_client") as mock_get_client:
        mock_get_client.return_value.detect_moderation_labels.side_effect = Exception("simulated AWS error")

        circle = app_client.post("/api/circles", json={"name": "Art", "creator_id": "u1"}).get_json()
        post = app_client.post(
            f"/api/circles/{circle['circle_id']}/posts",
            json={"title": "sketch", "author_id": "u1", "author_name": "A", "image_key": "posts/u1/x.png"},
        ).get_json()

        assert post["held_for_review"] is False  # error doesn't block posting


# ---------- Polly ----------

def _mock_polly_response(text: str):
    mock_response = MagicMock()
    mock_response.__getitem__.side_effect = lambda k: io.BytesIO(f"fake-mp3-audio-for:{text}".encode()) if k == "AudioStream" else None
    return {"AudioStream": io.BytesIO(f"fake-mp3-audio-for:{text}".encode())}


def test_read_aloud_synthesizes_and_returns_url(app_client):
    with patch("app.services.polly._get_client") as mock_get_client:
        mock_get_client.return_value.synthesize_speech.return_value = _mock_polly_response("hello")

        circle = app_client.post("/api/circles", json={"name": "Book Nook", "creator_id": "u1"}).get_json()
        post = app_client.post(
            f"/api/circles/{circle['circle_id']}/posts", json={"title": "hello", "body": "world", "author_id": "u1", "author_name": "A"}
        ).get_json()

        resp = app_client.get(f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/audio")
        assert resp.status_code == 200
        assert resp.get_json()["audio_url"].startswith("https://")
        assert mock_get_client.return_value.synthesize_speech.call_count == 1


def test_read_aloud_caches_and_does_not_resynthesize(app_client):
    with patch("app.services.polly._get_client") as mock_get_client:
        mock_get_client.return_value.synthesize_speech.return_value = _mock_polly_response("hello")

        circle = app_client.post("/api/circles", json={"name": "Book Nook", "creator_id": "u1"}).get_json()
        post = app_client.post(
            f"/api/circles/{circle['circle_id']}/posts", json={"title": "hello", "body": "world", "author_id": "u1", "author_name": "A"}
        ).get_json()

        app_client.get(f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/audio")
        app_client.get(f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/audio")
        app_client.get(f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/audio")

        assert mock_get_client.return_value.synthesize_speech.call_count == 1  # cached after the first call


def test_read_aloud_unavailable_over_budget(app_client):
    with patch("app.services.polly.get_char_usage", return_value=999_999_999):
        circle = app_client.post("/api/circles", json={"name": "Book Nook", "creator_id": "u1"}).get_json()
        post = app_client.post(
            f"/api/circles/{circle['circle_id']}/posts", json={"title": "hello", "body": "world", "author_id": "u1", "author_name": "A"}
        ).get_json()

        resp = app_client.get(f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/audio")
        assert resp.status_code == 503
