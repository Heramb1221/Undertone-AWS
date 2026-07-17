"""
Phase 11 DM tests — conversation storage, inbox listing, blocking, against
mocked AWS (moto). Fully verifiable, unlike the WebSocket layer itself.

Run with: python -m pytest backend/tests/test_phase11_dm.py -v
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


def test_send_and_read_conversation(client):
    resp = client.post("/api/dm/send", json={"sender_id": "A", "recipient_id": "B", "body": "hey"})
    assert resp.status_code == 201

    convo_from_a = client.get("/api/dm/conversation/B?user_id=A").get_json()
    convo_from_b = client.get("/api/dm/conversation/A?user_id=B").get_json()
    assert len(convo_from_a) == 1
    assert convo_from_a == convo_from_b  # same underlying thread regardless of who's asking


def test_conversation_is_symmetric_and_ordered(client):
    client.post("/api/dm/send", json={"sender_id": "A", "recipient_id": "B", "body": "one"})
    client.post("/api/dm/send", json={"sender_id": "B", "recipient_id": "A", "body": "two"})
    client.post("/api/dm/send", json={"sender_id": "A", "recipient_id": "B", "body": "three"})

    convo = client.get("/api/dm/conversation/B?user_id=A").get_json()
    assert [m["body"] for m in convo] == ["one", "two", "three"]


def test_cannot_message_self(client):
    resp = client.post("/api/dm/send", json={"sender_id": "A", "recipient_id": "A", "body": "hi me"})
    assert resp.status_code == 400


def test_inbox_lists_conversations_newest_first(client):
    client.post("/api/dm/send", json={"sender_id": "A", "recipient_id": "B", "body": "hi B"})
    client.post("/api/dm/send", json={"sender_id": "A", "recipient_id": "C", "body": "hi C"})
    client.post("/api/dm/send", json={"sender_id": "B", "recipient_id": "A", "body": "reply from B"})

    inbox = client.get("/api/dm/inbox?user_id=A").get_json()
    assert len(inbox) == 2  # one conversation each with B and C, not one row per message
    assert inbox[0]["other_user_id"] == "B"  # most recently active conversation first
    assert inbox[0]["last_message"] == "reply from B"


def test_blocking_prevents_messages(client):
    client.post("/api/dm/block", json={"user_id": "A", "blocked_user_id": "B"})

    resp = client.post("/api/dm/send", json={"sender_id": "B", "recipient_id": "A", "body": "let me talk to you"})
    assert resp.status_code == 403

    # Block is bidirectional in effect — B blocking A also stops A from messaging B
    resp2 = client.post("/api/dm/send", json={"sender_id": "A", "recipient_id": "B", "body": "still blocked"})
    assert resp2.status_code == 403


def test_unblock_restores_messaging(client):
    client.post("/api/dm/block", json={"user_id": "A", "blocked_user_id": "B"})
    client.post("/api/dm/unblock", json={"user_id": "A", "blocked_user_id": "B"})

    resp = client.post("/api/dm/send", json={"sender_id": "B", "recipient_id": "A", "body": "unblocked now"})
    assert resp.status_code == 201


def test_blocked_status_endpoint(client):
    assert client.get("/api/dm/blocked-status/B?user_id=A").get_json() == {"blocked": False}
    client.post("/api/dm/block", json={"user_id": "A", "blocked_user_id": "B"})
    assert client.get("/api/dm/blocked-status/B?user_id=A").get_json() == {"blocked": True}
