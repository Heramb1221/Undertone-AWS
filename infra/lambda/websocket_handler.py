"""
WebSocket Lambda handler. One Lambda function, three API Gateway WebSocket routes
($connect, $disconnect, $default) all pointing at `lambda_handler` below, which
dispatches on `event["requestContext"]["routeKey"]`.

INTENTIONAL DUPLICATION: this file re-implements minimal versions of
backend/app/models/connection.py and dm.py's table operations directly with boto3,
rather than importing the Flask app's modules. A "proper" setup would share code
via a Lambda Layer, but that adds packaging/deployment complexity that's hard to
get right without being able to test the actual deployment from this environment.
Duplication here is a small, deliberate trade-off — if the schema in
models/connection.py or models/dm.py changes, mirror the change here too.

DEPLOYMENT: zip this file (plus boto3, which is already available in the Lambda
runtime) and upload via infra/scripts/manage.py::create_websocket_api, or do it
manually via the Lambda console for your first deploy to see exactly what's
happening. Environment variable required: UNDERTONE_TABLE (same table as the
main app), AWS_REGION.

TESTED: the connect/message/disconnect *logic* is verified locally against a
real (non-AWS) WebSocket server in backend/tests/test_phase11_websocket_local.py.
The actual Lambda/API Gateway deployment is NOT verified from this sandbox —
no network path to AWS here. Verify it yourself after `manage.py up`.
"""

import os
import json
import time
import uuid
import boto3

REGION = os.environ.get("AWS_REGION", "ap-south-1")
TABLE_NAME = os.environ.get("UNDERTONE_TABLE", "Undertone")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)


def _management_client(event):
    domain = event["requestContext"]["domainName"]
    stage = event["requestContext"]["stage"]
    return boto3.client("apigatewaymanagementapi", endpoint_url=f"https://{domain}/{stage}")


def _push(event, connection_id: str, data: dict) -> None:
    client = _management_client(event)
    try:
        client.post_to_connection(ConnectionId=connection_id, Data=json.dumps(data).encode())
    except client.exceptions.GoneException:
        _deregister_connection(connection_id)


def _register_connection(user_id: str, connection_id: str) -> None:
    table.put_item(Item={"PK": f"USER#{user_id}", "SK": f"CONN#{connection_id}", "connection_id": connection_id})
    table.put_item(Item={"PK": f"CONN#{connection_id}", "SK": "META", "user_id": user_id})


def _get_user_for_connection(connection_id: str) -> str | None:
    item = table.get_item(Key={"PK": f"CONN#{connection_id}", "SK": "META"}).get("Item")
    return item["user_id"] if item else None


def _deregister_connection(connection_id: str) -> None:
    user_id = _get_user_for_connection(connection_id)
    if user_id:
        table.delete_item(Key={"PK": f"USER#{user_id}", "SK": f"CONN#{connection_id}"})
    table.delete_item(Key={"PK": f"CONN#{connection_id}", "SK": "META"})


def _get_connections_for_user(user_id: str) -> list[str]:
    response = table.query(
        KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues={":pk": f"USER#{user_id}", ":sk": "CONN#"},
    )
    return [item["connection_id"] for item in response.get("Items", [])]


def _subscribe_to_post(post_id: str, connection_id: str) -> None:
    table.put_item(Item={"PK": f"POST#{post_id}", "SK": f"SUB#{connection_id}", "connection_id": connection_id})


def _send_dm(sender_id: str, recipient_id: str, body: str) -> dict:
    conversation_id = "__".join(sorted([sender_id, recipient_id]))
    message_id = str(uuid.uuid4())
    created_at = int(time.time() * 1000)

    message = {
        "PK": f"DM#{conversation_id}", "SK": f"MSG#{created_at}#{message_id}",
        "message_id": message_id, "conversation_id": conversation_id,
        "sender_id": sender_id, "recipient_id": recipient_id, "body": body, "created_at": created_at,
    }
    table.put_item(Item=message)

    for owner, other in [(sender_id, recipient_id), (recipient_id, sender_id)]:
        table.put_item(Item={
            "PK": f"USER#{owner}", "SK": f"DMCONV#{conversation_id}",
            "conversation_id": conversation_id, "other_user_id": other,
            "last_message": body, "last_message_at": created_at,
        })

    return message


def lambda_handler(event, context):
    route = event["requestContext"]["routeKey"]
    connection_id = event["requestContext"]["connectionId"]

    if route == "$connect":
        user_id = (event.get("queryStringParameters") or {}).get("user_id")
        if not user_id:
            return {"statusCode": 400, "body": "user_id query param required"}
        _register_connection(user_id, connection_id)
        return {"statusCode": 200}

    if route == "$disconnect":
        _deregister_connection(connection_id)
        return {"statusCode": 200}

    # $default — a JSON message from the client: {"action": ..., ...}
    try:
        body = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": "invalid JSON"}

    action = body.get("action")

    if action == "subscribeToPost":
        _subscribe_to_post(body["post_id"], connection_id)
        return {"statusCode": 200}

    if action == "sendMessage":
        sender_id = _get_user_for_connection(connection_id)
        if not sender_id:
            return {"statusCode": 400, "body": "connection not registered"}
        message = _send_dm(sender_id, body["recipient_id"], body["body"])
        for conn in _get_connections_for_user(body["recipient_id"]):
            _push(event, conn, {"type": "dm", "message": message})
        return {"statusCode": 200}

    return {"statusCode": 400, "body": f"unknown action: {action}"}
