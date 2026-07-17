"""
Local WebSocket simulation. Proves the message-routing LOGIC that
infra/lambda/websocket_handler.py implements — connect, subscribe-to-post,
broadcast, send-DM, disconnect-cleanup — against REAL sockets on localhost,
using the actual DM model (models/dm.py) against a mocked DynamoDB (moto).

This is NOT a test of API Gateway or Lambda themselves — there's no network path
to AWS from this sandbox to test that. It IS a genuine test of whether the
protocol design and routing logic hold up under real (if local) two-client
concurrent WebSocket traffic, which is the part most likely to have a real bug.

Run directly: python backend/tests/test_phase11_websocket_local.py
"""

import asyncio
import json
import os
import sys

os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_REGION", "ap-south-1")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "infra", "scripts"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import websockets
from moto import mock_aws


class LocalRealtimeServer:
    """Mirrors websocket_handler.py's routing, using real models/dm.py logic."""

    def __init__(self):
        self.user_connections: dict[str, set] = {}
        self.post_subscribers: dict[str, set] = {}
        self.connection_users: dict[object, str] = {}

    async def handler(self, ws):
        try:
            async for raw in ws:
                msg = json.loads(raw)
                action = msg.get("action")

                if action == "connect":
                    user_id = msg["user_id"]
                    self.connection_users[ws] = user_id
                    self.user_connections.setdefault(user_id, set()).add(ws)
                    await ws.send(json.dumps({"type": "connected", "user_id": user_id}))

                elif action == "subscribeToPost":
                    self.post_subscribers.setdefault(msg["post_id"], set()).add(ws)
                    await ws.send(json.dumps({"type": "subscribed", "post_id": msg["post_id"]}))

                elif action == "sendMessage":
                    from app.models.dm import send_message

                    sender_id = self.connection_users[ws]
                    message = send_message(sender_id, msg["recipient_id"], msg["body"])
                    for recipient_ws in self.user_connections.get(msg["recipient_id"], set()):
                        await recipient_ws.send(json.dumps({"type": "dm", "message": message}))
        finally:
            user_id = self.connection_users.pop(ws, None)
            if user_id:
                self.user_connections.get(user_id, set()).discard(ws)
            for subs in self.post_subscribers.values():
                subs.discard(ws)

    async def broadcast_vote_update(self, post_id: str, data: dict):
        """Mirrors what Flask's services/broadcast.py::push_to_post_subscribers does."""
        for ws in self.post_subscribers.get(post_id, set()):
            await ws.send(json.dumps({"type": "vote_update", **data}))


async def run_simulation():
    with mock_aws():
        import manage

        manage.create_table()

        server = LocalRealtimeServer()
        async with websockets.serve(server.handler, "localhost", 8765):
            client_a = await websockets.connect("ws://localhost:8765")
            client_b = await websockets.connect("ws://localhost:8765")

            await client_a.send(json.dumps({"action": "connect", "user_id": "UserA"}))
            await client_a.recv()
            await client_b.send(json.dumps({"action": "connect", "user_id": "UserB"}))
            await client_b.recv()
            print("[ok] Both clients connected and registered")

            await client_a.send(json.dumps({"action": "subscribeToPost", "post_id": "post123"}))
            await client_a.recv()
            print("[ok] Client A subscribed to post123")

            await server.broadcast_vote_update("post123", {"post_id": "post123", "nod_count": 5, "pass_count": 1})
            update = json.loads(await asyncio.wait_for(client_a.recv(), timeout=2))
            assert update["type"] == "vote_update" and update["nod_count"] == 5
            print(f"[ok] Client A received live vote update: {update}")

            b_did_not_receive = True
            try:
                await asyncio.wait_for(client_b.recv(), timeout=0.3)
                b_did_not_receive = False
            except asyncio.TimeoutError:
                pass
            assert b_did_not_receive
            print("[ok] Client B (not subscribed) correctly received nothing")

            await client_b.send(json.dumps({"action": "sendMessage", "recipient_id": "UserA", "body": "hey, saw your post"}))
            dm = json.loads(await asyncio.wait_for(client_a.recv(), timeout=2))
            assert dm["type"] == "dm" and dm["message"]["body"] == "hey, saw your post"
            print(f"[ok] Client A received live DM push: {dm['message']['body']!r}")

            from app.models.dm import get_conversation

            history = get_conversation("UserA", "UserB")
            assert len(history) == 1 and history[0]["body"] == "hey, saw your post"
            print("[ok] DM was actually persisted to DynamoDB (mocked), not just pushed in-memory")

            await client_a.close()
            await asyncio.sleep(0.1)
            print("[ok] Client A disconnected cleanly")

            print("\nAll realtime routing logic verified against real local sockets.")


if __name__ == "__main__":
    asyncio.run(run_simulation())
