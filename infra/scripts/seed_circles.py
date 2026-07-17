"""
Seeds the 10 launch Circles from docs/PRD.md section 9 (confirmed with you
during planning). Idempotent — safe to run more than once, since
create_circle's atomic uniqueness check (Phase 4) will just reject duplicates
of a name that already exists rather than erroring the whole script.

Run with: python infra/scripts/seed_circles.py
Requires the same AWS setup as manage.py (credentials configured, table already
created via `manage.py up`).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from app.models.circle import create_circle, CircleNameTakenError
from app.models.user import create_profile, get_profile

SEED_ADMIN_ID = "seed_admin"
SEED_ADMIN_NAME = "QuietFoundations_1"

SEED_CIRCLES = [
    ("Quiet Hobbies", "Knitting, puzzles, model trains — the calm stuff, no performance required."),
    ("Late Night Thoughts", "For the 2am overthinking. You're not the only one awake."),
    ("Book Nook", "For readers who reread. Recommendations, comfort books, whatever you're into lately."),
    ("Social Anxiety Support", "A place to talk about it without having to explain yourself first."),
    ("Overthinkers Anonymous", "You've thought about this way more than the situation warranted. Welcome."),
    ("Introvert Career Talk", "Networking without small talk, interviews without performing extroversion."),
    ("Small Wins", "Made your bed. Answered an email. Left the house. All of it counts here."),
    ("Deep Questions", "The conversations that don't fit into small talk."),
    ("Study & Focus", "Body doubling, focus techniques, and just working quietly alongside others."),
    ("Comfort Media", "The movies, shows, and games that feel like a weighted blanket."),
]


def ensure_seed_admin_exists():
    if get_profile(SEED_ADMIN_ID):
        print(f"[skip] Seed admin profile already exists: {SEED_ADMIN_ID}")
        return
    create_profile(SEED_ADMIN_ID, SEED_ADMIN_NAME, avatar_seed=SEED_ADMIN_NAME, interests=[])
    print(f"[created] Seed admin profile: {SEED_ADMIN_NAME}")


def seed_circles():
    ensure_seed_admin_exists()

    for name, description in SEED_CIRCLES:
        try:
            create_circle(name, description, creator_id=SEED_ADMIN_ID)
            print(f"[created] Circle: {name}")
        except CircleNameTakenError:
            print(f"[skip] Circle already exists: {name}")


if __name__ == "__main__":
    seed_circles()
