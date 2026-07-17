"""
Shared DynamoDB table handle. Region and table name match infra/scripts/manage.py.
"""

import os
import boto3
from boto3.dynamodb.types import TypeSerializer

REGION = os.environ.get("AWS_REGION", "ap-south-1")
TABLE_NAME = os.environ.get("UNDERTONE_TABLE", "Undertone")

# In tests, moto patches boto3 before this module is imported, so this stays lazy-safe.
_dynamodb = boto3.resource("dynamodb", region_name=REGION)
_client = boto3.client("dynamodb", region_name=REGION)
_serializer = TypeSerializer()


def get_table():
    return _dynamodb.Table(TABLE_NAME)


def get_client():
    """Low-level client — needed for transact_write_items (atomic multi-item writes)."""
    return _client


def to_dynamo_item(python_dict: dict) -> dict:
    """Converts a plain python dict into DynamoDB's low-level item format, for use with transact_write_items."""
    return {k: _serializer.serialize(v) for k, v in python_dict.items()}

