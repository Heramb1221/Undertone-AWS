"""
S3 service. Bucket is private (no public-read) per Architecture.md section 7 —
every image is served through a short-lived presigned URL, never a direct link.
"""

import os
import uuid
import boto3

REGION = os.environ.get("AWS_REGION", "ap-south-1")
BUCKET_NAME = os.environ.get("UNDERTONE_BUCKET", "undertone-media")

endpoint_url = f"https://s3.{REGION}.amazonaws.com"
_s3 = boto3.client("s3", region_name=REGION, endpoint_url=endpoint_url)


def get_s3_client():
    """Exposed for reuse by other services (e.g. polly.py caching audio in the same bucket)."""
    return _s3

UPLOAD_URL_EXPIRY_SECONDS = 300  # 5 minutes to complete the upload
VIEW_URL_EXPIRY_SECONDS = 3600  # 1 hour to view an image once loaded


def generate_upload_key(user_id: str, content_type: str) -> str:
    ext = content_type.split("/")[-1] if "/" in content_type else "bin"
    return f"posts/{user_id}/{uuid.uuid4()}.{ext}"


def generate_presigned_upload_url(key: str, content_type: str) -> str:
    return _s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": BUCKET_NAME, "Key": key, "ContentType": content_type},
        ExpiresIn=UPLOAD_URL_EXPIRY_SECONDS,
    )


def generate_presigned_view_url(key: str) -> str:
    return _s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET_NAME, "Key": key},
        ExpiresIn=VIEW_URL_EXPIRY_SECONDS,
    )
