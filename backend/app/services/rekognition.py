"""
Rekognition image moderation (PRD.md section 7.6). Region us-east-1 per your
call, only used if it stays within free tier (5,000 images/month —
infra/free-tier-limits.md). A monthly usage counter enforces a buffer under that
cap: if approached, checks are skipped entirely and the image passes through
unchecked rather than ever risk a paid call. Failures (API error, cap reached)
"fail open" — an image is never blocked from posting due to an infra hiccup;
worst case, an unchecked image needs a human report instead of an automated one.

UNTESTED AGAINST REAL AWS from this sandbox — no network path to Rekognition
here. The flagging decision logic and usage-cap gating ARE unit-tested against a
mocked boto3 client in backend/tests/test_phase12.py.
"""

import os
import boto3
from datetime import datetime, timezone
from app.db import get_table

REKOGNITION_REGION = "us-east-1"
MONTHLY_FREE_LIMIT = int(os.environ.get("REKOGNITION_MONTHLY_LIMIT", 4500))  # buffer under the real 5,000
CONFIDENCE_THRESHOLD = 80.0

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = boto3.client("rekognition", region_name=REKOGNITION_REGION)
    return _client


def _usage_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def get_usage_count() -> int:
    table = get_table()
    item = table.get_item(Key={"PK": "SYSTEM#REKOGNITION_USAGE", "SK": _usage_key()}).get("Item")
    return int(item["count"]) if item else 0


def _increment_usage() -> None:
    table = get_table()
    table.update_item(
        Key={"PK": "SYSTEM#REKOGNITION_USAGE", "SK": _usage_key()},
        UpdateExpression="ADD #c :one",
        ExpressionAttributeNames={"#c": "count"},
        ExpressionAttributeValues={":one": 1},
    )


def moderate_image(bucket: str, key: str) -> tuple[bool, list[str]]:
    """Returns (is_flagged, labels). Fails open (not-flagged) if the monthly
    budget is exhausted or the API call errors — see module docstring."""
    if get_usage_count() >= MONTHLY_FREE_LIMIT:
        return False, []

    try:
        response = _get_client().detect_moderation_labels(
            Image={"S3Object": {"Bucket": bucket, "Name": key}}, MinConfidence=CONFIDENCE_THRESHOLD
        )
    except Exception:
        return False, []

    _increment_usage()
    labels = [label["Name"] for label in response.get("ModerationLabels", [])]
    return len(labels) > 0, labels
