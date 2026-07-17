"""
Phase 9 integration test — Token awarding across all trigger points, and Rhythm
streak logic (increment/reset/no-double-count-same-day), against mocked AWS.

Run with: python -m pytest backend/tests/test_phase9.py -v
"""

import os
import sys
import pytest
from moto import mock_aws
from unittest.mock import patch
from datetime import datetime, timedelta, timezone

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


def test_first_words_token_on_first_post(client):
    client.post("/api/identity", json={"user_id": "u1", "anonymous_name": "QuietWriter_5", "interests": []})
    circle = client.post("/api/circles", json={"name": "Book Nook", "creator_id": "u1"}).get_json()

    tokens_before = {t["token_id"] for t in client.get("/api/identity/u1/tokens").get_json()}
    assert tokens_before == {"circle_starter"}  # correctly awarded immediately on Circle creation

    client.post(
        f"/api/circles/{circle['circle_id']}/posts",
        json={"title": "hello", "author_id": "u1", "author_name": "QuietWriter_5"},
    )

    tokens = {t["token_id"] for t in client.get("/api/identity/u1/tokens").get_json()}
    assert "first_words" in tokens
    assert "circle_starter" in tokens


def test_breaking_the_silence_token_on_first_comment(client):
    client.post("/api/identity", json={"user_id": "u1", "anonymous_name": "A", "interests": []})
    client.post("/api/identity", json={"user_id": "u2", "anonymous_name": "B", "interests": []})
    circle = client.post("/api/circles", json={"name": "Quiet Hobbies", "creator_id": "u1"}).get_json()
    post = client.post(
        f"/api/circles/{circle['circle_id']}/posts", json={"title": "hi", "author_id": "u1", "author_name": "A"}
    ).get_json()

    client.post(f"/api/posts/{post['post_id']}/comments", json={"body": "same", "author_id": "u2", "author_name": "B"})

    tokens = {t["token_id"] for t in client.get("/api/identity/u2/tokens").get_json()}
    assert "breaking_the_silence" in tokens


def test_familiar_face_token_after_five_joins(client):
    client.post("/api/identity", json={"user_id": "joiner", "anonymous_name": "J", "interests": []})
    client.post("/api/identity", json={"user_id": "creator", "anonymous_name": "C", "interests": []})

    for i in range(5):
        circle = client.post("/api/circles", json={"name": f"Circle {i}", "creator_id": "creator"}).get_json()
        client.post(f"/api/circles/{circle['circle_id']}/join", json={"user_id": "joiner"})

    tokens = {t["token_id"] for t in client.get("/api/identity/joiner/tokens").get_json()}
    assert "familiar_face" in tokens


def test_deep_reader_token_at_50_resonance(client):
    client.post("/api/identity", json={"user_id": "author", "anonymous_name": "A", "interests": []})
    circle = client.post("/api/circles", json={"name": "Book Nook", "creator_id": "author"}).get_json()
    post = client.post(
        f"/api/circles/{circle['circle_id']}/posts", json={"title": "hi", "author_id": "author", "author_name": "A"}
    ).get_json()

    for i in range(50):
        client.post(
            f"/api/circles/{circle['circle_id']}/posts/{post['post_id']}/vote",
            json={"user_id": f"voter{i}", "vote": "nod"},
        )

    profile = client.get("/api/identity/author").get_json()
    assert profile["resonance_score"] == 50

    tokens = {t["token_id"] for t in client.get("/api/identity/author/tokens").get_json()}
    assert "deep_reader" in tokens
    assert "quiet_influence" not in tokens  # threshold is 200, shouldn't fire early


def test_token_not_re_awarded(client):
    client.post("/api/identity", json={"user_id": "u1", "anonymous_name": "A", "interests": []})
    circle = client.post("/api/circles", json={"name": "Book Nook", "creator_id": "u1"}).get_json()
    client.post(f"/api/circles/{circle['circle_id']}/posts", json={"title": "one", "author_id": "u1", "author_name": "A"})
    client.post(f"/api/circles/{circle['circle_id']}/posts", json={"title": "two", "author_id": "u1", "author_name": "A"})

    tokens = client.get("/api/identity/u1/tokens").get_json()
    first_words_count = sum(1 for t in tokens if t["token_id"] == "first_words")
    assert first_words_count == 1  # not duplicated on the second post


def test_rhythm_first_action_sets_streak_to_one(client):
    client.post("/api/identity", json={"user_id": "u1", "anonymous_name": "A", "interests": []})
    client.post("/api/circles", json={"name": "Book Nook", "creator_id": "u1"})

    profile = client.get("/api/identity/u1").get_json()
    assert profile["rhythm_streak_days"] == 1


def test_rhythm_same_day_does_not_double_count(client):
    client.post("/api/identity", json={"user_id": "u1", "anonymous_name": "A", "interests": []})
    circle = client.post("/api/circles", json={"name": "Book Nook", "creator_id": "u1"}).get_json()
    client.post(f"/api/circles/{circle['circle_id']}/posts", json={"title": "one", "author_id": "u1", "author_name": "A"})
    client.post(f"/api/circles/{circle['circle_id']}/posts", json={"title": "two", "author_id": "u1", "author_name": "A"})

    profile = client.get("/api/identity/u1").get_json()
    assert profile["rhythm_streak_days"] == 1  # two actions, same day — still 1


def test_rhythm_consecutive_day_increments(client):
    from app.services import rhythm as rhythm_module

    client.post("/api/identity", json={"user_id": "u1", "anonymous_name": "A", "interests": []})

    day1 = datetime(2026, 6, 1, tzinfo=timezone.utc)
    day2 = day1 + timedelta(days=1)

    with patch.object(rhythm_module, "_today_str", return_value=day1.strftime("%Y-%m-%d")):
        client.post("/api/circles", json={"name": "Book Nook", "creator_id": "u1"})

    with patch.object(rhythm_module, "_today_str", return_value=day2.strftime("%Y-%m-%d")):
        client.post("/api/circles", json={"name": "Study Circle", "creator_id": "u1"})

    profile = client.get("/api/identity/u1").get_json()
    assert profile["rhythm_streak_days"] == 2


def test_rhythm_resets_after_gap_day(client):
    from app.services import rhythm as rhythm_module

    client.post("/api/identity", json={"user_id": "u1", "anonymous_name": "A", "interests": []})

    day1 = datetime(2026, 6, 1, tzinfo=timezone.utc)
    day3 = day1 + timedelta(days=3)  # a gap — day 2 skipped

    with patch.object(rhythm_module, "_today_str", return_value=day1.strftime("%Y-%m-%d")):
        client.post("/api/circles", json={"name": "Book Nook", "creator_id": "u1"})

    with patch.object(rhythm_module, "_today_str", return_value=day3.strftime("%Y-%m-%d")):
        client.post("/api/circles", json={"name": "Study Circle", "creator_id": "u1"})

    profile = client.get("/api/identity/u1").get_json()
    assert profile["rhythm_streak_days"] == 1  # reset, not 2


def test_steady_presence_token_at_seven_day_streak(client):
    from app.services import rhythm as rhythm_module

    client.post("/api/identity", json={"user_id": "u1", "anonymous_name": "A", "interests": []})
    base = datetime(2026, 6, 1, tzinfo=timezone.utc)

    for i in range(7):
        day = base + timedelta(days=i)
        with patch.object(rhythm_module, "_today_str", return_value=day.strftime("%Y-%m-%d")):
            client.post("/api/circles", json={"name": f"Circle {i}", "creator_id": "u1"})

    profile = client.get("/api/identity/u1").get_json()
    assert profile["rhythm_streak_days"] == 7

    tokens = {t["token_id"] for t in client.get("/api/identity/u1/tokens").get_json()}
    assert "steady_presence" in tokens
    assert "old_soul" not in tokens  # threshold is 30
