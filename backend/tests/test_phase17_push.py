"""
Phase 17 push notification tests. DynamoDB via moto. The Expo push API call
itself is mocked (unittest.mock, patching requests.post) — same pattern as
Rekognition/Polly in test_phase12.py — since there's no network path to
exp.host from this sandbox. Tests OUR registration/gating/wiring logic, not
Expo's actual delivery behavior.

Run with: python -m pytest backend/tests/test_phase17_push.py -v
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock
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


def test_register_push_token(client):
    resp = client.post("/api/push/register", json={"user_id": "u1", "token": "ExponentPushToken[abc123]", "platform": "expo"})
    assert resp.status_code == 201
    assert resp.get_json()["registered"] is True


def test_register_requires_user_and_token(client):
    resp = client.post("/api/push/register", json={"user_id": "u1"})
    assert resp.status_code == 400


def test_dm_send_triggers_push_to_registered_recipient(client):
    client.post("/api/push/register", json={"user_id": "recipient1", "token": "ExponentPushToken[xyz]", "platform": "expo"})

    with patch("app.services.push.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200)

        resp = client.post("/api/dm/send", json={"sender_id": "sender1", "recipient_id": "recipient1", "body": "hey there"})
        assert resp.status_code == 201

        assert mock_post.call_count == 1
        call_kwargs = mock_post.call_args
        sent_json = call_kwargs.kwargs["json"] if call_kwargs.kwargs else call_kwargs[1]["json"]
        assert sent_json["to"] == "ExponentPushToken[xyz]"
        assert "sender1" in sent_json["body"]


def test_dm_send_does_not_fail_when_recipient_has_no_token(client):
    with patch("app.services.push.requests.post") as mock_post:
        resp = client.post("/api/dm/send", json={"sender_id": "sender1", "recipient_id": "no_token_user", "body": "hello"})
        assert resp.status_code == 201  # DM still succeeds
        mock_post.assert_not_called()  # no token, no push attempt


def test_dm_send_does_not_fail_when_expo_api_errors(client):
    client.post("/api/push/register", json={"user_id": "recipient1", "token": "ExponentPushToken[xyz]", "platform": "expo"})

    with patch("app.services.push.requests.post") as mock_post:
        mock_post.side_effect = Exception("network error")

        resp = client.post("/api/dm/send", json={"sender_id": "sender1", "recipient_id": "recipient1", "body": "hey"})
        assert resp.status_code == 201  # DM still succeeds even though push failed


def test_send_push_notification_returns_false_with_no_token():
    from app.services.push import send_push_notification
    import os as _os

    _os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
    with mock_aws():
        import sys as _sys

        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "infra", "scripts"))
        import manage as _manage

        _manage.create_table()
        result = send_push_notification("nobody", "title", "body")
        assert result is False
