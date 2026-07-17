"""
Polly "read aloud" (PRD.md section 7.9 — a genuinely on-brand introvert feature:
consume content without reading fatigue). Standard voice only, NOT Neural (Neural
isn't covered by free tier — infra/free-tier-limits.md), region us-east-1 per
your call. Audio is synthesized once per post and cached in S3 (audio/<post_id>.mp3)
so repeat listens never re-call Polly — this also means a post's audio doesn't
regenerate if the post is edited later (out of scope; no edit feature exists yet).
A monthly character-usage counter enforces a buffer under the 5,000,000/month cap.

UNTESTED AGAINST REAL AWS from this sandbox. Caching and gating logic ARE
unit-tested against a mocked boto3 client in backend/tests/test_phase12.py.
"""

import os
import boto3
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from app.db import get_table
from app.services.s3 import BUCKET_NAME, get_s3_client, generate_presigned_view_url

POLLY_REGION = "us-east-1"
MONTHLY_CHAR_LIMIT = int(os.environ.get("POLLY_MONTHLY_CHAR_LIMIT", 4_800_000))  # buffer under the real 5,000,000
VOICE_ID = "Joanna"
MAX_CHARS_PER_POST = 3000  # Polly's own per-request limit for standard synthesis is higher, but this keeps costs/latency sane

_client = None


class PollyUnavailableError(Exception):
    pass


def _get_client():
    global _client
    if _client is None:
        _client = boto3.client("polly", region_name=POLLY_REGION)
    return _client


def _usage_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def get_char_usage() -> int:
    table = get_table()
    item = table.get_item(Key={"PK": "SYSTEM#POLLY_USAGE", "SK": _usage_key()}).get("Item")
    return int(item["chars"]) if item else 0


def _add_char_usage(n: int) -> None:
    table = get_table()
    table.update_item(
        Key={"PK": "SYSTEM#POLLY_USAGE", "SK": _usage_key()},
        UpdateExpression="ADD chars :n",
        ExpressionAttributeValues={":n": n},
    )


def get_or_create_audio_url(post_id: str, text: str) -> str:
    audio_key = f"audio/{post_id}.mp3"
    s3 = get_s3_client()

    try:
        s3.head_object(Bucket=BUCKET_NAME, Key=audio_key)
        return generate_presigned_view_url(audio_key)  # already synthesized — no Polly call needed
    except ClientError:
        pass  # not cached yet, fall through

    text = text[:MAX_CHARS_PER_POST]

    if get_char_usage() + len(text) > MONTHLY_CHAR_LIMIT:
        raise PollyUnavailableError("Read-aloud is temporarily unavailable — monthly free-tier budget reached.")

    response = _get_client().synthesize_speech(Text=text, OutputFormat="mp3", VoiceId=VOICE_ID, Engine="standard")
    audio_bytes = response["AudioStream"].read()

    s3.put_object(Bucket=BUCKET_NAME, Key=audio_key, Body=audio_bytes, ContentType="audio/mpeg")
    _add_char_usage(len(text))

    return generate_presigned_view_url(audio_key)
