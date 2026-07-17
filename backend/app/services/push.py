"""
Push notification delivery via Expo's push service (per your decision — not AWS
SNS, since Android push requires FCM credentials regardless of provider, and
you chose to skip that setup for now; see docs in mobile/src/lib/pushNotifications.ts
for the full reasoning).

UNTESTED AGAINST THE REAL EXPO PUSH API from this sandbox — no network path to
exp.host from here. The request shape matches Expo's documented API exactly;
failures are caught and logged rather than raised, so a broken/missing push
token never breaks the actual DM send it's attached to (push is a bonus
notification, not a dependency of the core feature).
"""

import requests
from app.models.push_token import get_push_token

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push_notification(user_id: str, title: str, body: str, data: dict | None = None) -> bool:
    token = get_push_token(user_id)
    if not token:
        return False  # no token registered — not an error, just nothing to send to

    try:
        response = requests.post(
            EXPO_PUSH_URL,
            json={"to": token, "title": title, "body": body, "data": data or {}, "sound": "default"},
            headers={"Content-Type": "application/json"},
            timeout=5,
        )
        return response.status_code == 200
    except Exception:
        # Deliberately broad: this is a non-critical side effect (see module
        # docstring). A narrower `except requests.RequestException` was caught
        # by test_dm_send_does_not_fail_when_expo_api_errors — any OTHER
        # exception (bad response parsing, an unexpected error type) would have
        # propagated and taken down the actual DM send with it, which defeats
        # the entire point of this being best-effort.
        return False
