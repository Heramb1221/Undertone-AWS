"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/**
 * WebSocket client. Points at NEXT_PUBLIC_WS_URL (the API Gateway WebSocket URL
 * printed by infra/scripts/manage.py::create_websocket_api). If that env var
 * isn't set — local dev without the realtime layer deployed, or this sandbox —
 * the hook simply never connects, and callers should treat "no live updates"
 * as a graceful degradation, not an error. Nothing else in the app depends on
 * this succeeding; every feature already works over plain REST from Phases 4-10.
 */

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

type WsEvent =
  | { type: "vote_update"; post_id?: string; comment_id?: string; nod_count: number; pass_count: number }
  | { type: "new_comment"; comment: unknown }
  | { type: "dm"; message: unknown }
  | { type: "connected" | "subscribed"; [key: string]: unknown };

export function useRealtimeConnection(userId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef<Set<(event: WsEvent) => void>>(new Set());

  useEffect(() => {
    if (!WS_URL || !userId) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function connect() {
      const ws = new WebSocket(`${WS_URL}?user_id=${encodeURIComponent(userId!)}`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) reconnectTimer = setTimeout(connect, 3000); // simple backoff
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsEvent;
          listenersRef.current.forEach((fn) => fn(data));
        } catch {
          // ignore malformed frames
        }
      };
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [userId]);

  const subscribeToPost = useCallback((postId: string) => {
    wsRef.current?.send(JSON.stringify({ action: "subscribeToPost", post_id: postId }));
  }, []);

  const sendDirectMessage = useCallback((recipientId: string, body: string) => {
    wsRef.current?.send(JSON.stringify({ action: "sendMessage", recipient_id: recipientId, body }));
  }, []);

  const addListener = useCallback((fn: (event: WsEvent) => void) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  return { connected: WS_URL ? connected : false, subscribeToPost, sendDirectMessage, addListener };
}
