import { useEffect, useRef, useCallback, useState } from "react";
import Constants from "expo-constants";

/**
 * WebSocket client — mobile's own independent implementation (per Q25), mirrors
 * web/lib/useRealtimeConnection.ts's shape and the same graceful-degradation
 * principle: if wsUrl isn't configured in app.json's extra, this hook simply
 * never connects, and every feature (DMs, live vote/comment updates) already
 * works over plain REST regardless — this is a bonus layer, not a dependency.
 *
 * UNTESTED AGAINST REAL AWS from this sandbox, same as web Phase 11 — no
 * network path to API Gateway here.
 */

const WS_URL = Constants.expoConfig?.extra?.wsUrl as string | undefined;

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
        if (!cancelled) reconnectTimer = setTimeout(connect, 3000);
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
