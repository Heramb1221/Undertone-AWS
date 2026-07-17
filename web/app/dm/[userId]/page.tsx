"use client";

import { useEffect, useRef, useState } from "react";
import { api, DmMessage, Profile } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";
import { useRealtimeConnection } from "@/lib/useRealtimeConnection";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";
import { timeAgo } from "@/lib/timeAgo";

export default function ConversationPage({ params }: { params: { userId: string } }) {
  const [identity, setIdentity] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const otherUserId = decodeURIComponent(params.userId);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [body, setBody] = useState("");
  const [blocked, setBlocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { connected, addListener } = useRealtimeConnection(identity?.userId ?? null);

  async function refresh() {
    if (!identity) return;
    const data = await api.getDmConversation(identity.userId, otherUserId);
    setMessages(data);
  }

  useEffect(() => {
    const id = getLocalIdentity();
    setIdentity(id);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || !identity) return;
    refresh();

    // Fetch recipient profile for display name
    api.getProfile(otherUserId)
      .then(setOtherProfile)
      .catch(() => {});

    // Polling fallback — works whether or not the WebSocket layer is deployed,
    // so DMs are usable in local dev without needing `manage.py up` to have run.
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, identity, otherUserId]);

  useEffect(() => {
    // Live push, when the WebSocket layer IS deployed — bypasses the 4s poll delay.
    return addListener((event) => {
      if (event.type === "dm") refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addListener]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!identity || !body.trim()) return;
    const text = body;
    setBody("");
    try {
      await api.sendDm(identity.userId, otherUserId, text);
      await refresh();
    } catch (err) {
      setBlocked(err instanceof Error && err.message.includes("message this person"));
    }
  }

  if (!isLoaded || !identity) {
    return (
      <main className="max-w-reading mx-auto px-4 py-16 text-center">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Finish onboarding first.
        </p>
      </main>
    );
  }

  const otherDisplayName = otherProfile?.anonymous_name || otherUserId;

  return (
    <>
      <Header />
      <main className="max-w-reading mx-auto px-4 py-8 flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="flex items-center gap-3 pb-4 border-b shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
          <Avatar seed={otherDisplayName} size={36} />
          <div className="font-medium text-text-primary">{otherDisplayName}</div>
          <span
            className="ml-auto text-xs"
            style={{ color: connected ? "var(--accent-secondary)" : "var(--text-secondary)" }}
          >
            {connected ? "live" : "polling"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {messages.map((m) => {
            const mine = m.sender_id === identity.userId;
            return (
              <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-xs px-3 py-2 rounded-md text-sm"
                  style={{
                    background: mine ? "var(--accent-primary)" : "var(--bg-elevated)",
                    color: mine ? "#2B1608" : "var(--text-primary)",
                  }}
                >
                  {m.body}
                  <div className="text-[10px] mt-1 opacity-70 text-right">{timeAgo(m.created_at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {blocked ? (
          <p className="text-sm py-3 shrink-0" style={{ color: "var(--accent-danger)" }}>
            You can&apos;t message this person.
          </p>
        ) : (
          <div className="flex gap-2 pt-3 border-t shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Message…"
              aria-label="Message"
              className="flex-1 px-3 py-2 rounded-sm border text-sm bg-transparent outline-none"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            />
            <Button variant="primary" onClick={send}>
              Send
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
