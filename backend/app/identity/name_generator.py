"""
Interest-based Anonymous Identity generator.
Mirrors web/lib/nameGenerator.ts exactly — keep both in sync.
Used at signup time to write the Anonymous Identity onto the user's DynamoDB profile
(kept separate from the Cognito login credential — see docs/Architecture.md section 4).
"""

import random

INTERESTS = {
    "books": {"label": "Books & Reading", "nouns": ["Reader", "Bookworm", "Pageturner"]},
    "nature": {"label": "Nature & Outdoors", "nouns": ["Wanderer", "Trailwalker", "Rambler"]},
    "music": {"label": "Music", "nouns": ["Listener", "Hummer", "Tunesmith"]},
    "art": {"label": "Art & Illustration", "nouns": ["Sketcher", "Doodler", "Inkwell"]},
    "gaming": {"label": "Gaming", "nouns": ["Gamer", "Questgiver", "Pixelwalker"]},
    "movies": {"label": "Movies & TV", "nouns": ["Watcher", "Screenwriter", "Storyfan"]},
    "coding": {"label": "Coding & Tech", "nouns": ["Coder", "Debugger", "Tinkerer"]},
    "writing": {"label": "Writing & Journaling", "nouns": ["Scribe", "Journalist", "Wordsmith"]},
    "cooking": {"label": "Cooking & Baking", "nouns": ["Baker", "Simmerer", "Spicehunter"]},
    "fitness": {"label": "Fitness & Movement", "nouns": ["Runner", "Stretcher", "Pathfinder"]},
    "conversations": {"label": "Deep Conversations", "nouns": ["Thinker", "Muser", "Philosopher"]},
    "quiet_hobbies": {"label": "Quiet Hobbies", "nouns": ["Knitter", "Collector", "Puzzler"]},
}

ADJECTIVES = [
    "Quiet", "Moonlit", "Gentle", "Hushed", "Soft", "Slow",
    "Late-Night", "Early-Morning", "Muted", "Calm", "Wandering", "Distant",
]


def generate_anonymous_name(selected_interests: list[str]) -> str:
    pool = [INTERESTS[i] for i in selected_interests if i in INTERESTS]
    if pool:
        noun = random.choice(random.choice(pool)["nouns"])
    else:
        all_nouns = [n for v in INTERESTS.values() for n in v["nouns"]]
        noun = random.choice(all_nouns)

    adjective = random.choice(ADJECTIVES)
    number = random.randint(10, 99)
    return f"{adjective}{noun}_{number}"
