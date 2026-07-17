"""
Broadcast service. Flask (running on ECS) calls this after a vote/comment/DM to
push a live update to connected WebSocket clients — the actual delivery goes
through API Gateway's Management API, which can post a message to any open
connection by its connection_id.

DEPLOYMENT NOTE: requires the WEBSOCKET_API_ENDPOINT env var (the API Gateway
Management API endpoint — see infra/scripts/manage.py::create_websocket_api,
which prints it on creation). Until that's set, every function here no-ops
silently rather than raising, so the REST API keeps working exactly as it did
in Phases 4-10 whether or not the realtime layer is deployed. This also means
this file's actual AWS behavior is UNTESTED from this sandbox — no network path
to API Gateway here. The connection-tracking logic underneath it (models/connection.py)
IS tested, and the whole message-routing shape is verified against a local
WebSocket server in tests/test_phase11_websocket_local.py.
"""

import os
import json
import boto3
from botocore.exceptions import ClientError
from app.models.connection import (
    get_connections_for_user,
    get_connections_subscribed_to_post,
    deregister_connection,
)

WEBSOCKET_API_ENDPOINT = os.environ.get("WEBSOCKET_API_ENDPOINT")


def _client():
    if not WEBSOCKET_API_ENDPOINT:
        return None
    return boto3.client("apigatewaymanagementapi", endpoint_url=WEBSOCKET_API_ENDPOINT)


def push_to_connection(connection_id: str, data: dict) -> None:
    client = _client()
    if not client:
        return  # no-op — WebSocket layer not deployed/configured

    try:
        client.post_to_connection(ConnectionId=connection_id, Data=json.dumps(data).encode())
    except ClientError as e:
        if e.response["Error"]["Code"] == "GoneException":
            deregister_connection(connection_id)  # client disconnected without a clean $disconnect
        else:
            raise


def push_to_user(user_id: str, data: dict) -> None:
    for connection_id in get_connections_for_user(user_id):
        push_to_connection(connection_id, data)


def push_to_post_subscribers(post_id: str, data: dict) -> None:
    for connection_id in get_connections_subscribed_to_post(post_id):
        push_to_connection(connection_id, data)
