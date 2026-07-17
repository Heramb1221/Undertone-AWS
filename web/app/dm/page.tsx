"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, DmConversation } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/timeAgo";
import { Header } from "@/components/ui/Header";

export default function InboxPage() {
  const [identity, setIdentity] = useState<any>(null);
  const [conversations, setConversations] = useState<DmConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // User Search to Start Chat
  const [searchName, setSearchName] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const id = getLocalIdentity();
    setIdentity(id);
    setIsLoaded(true);
    if (!id) return;
    api.getDmInbox(id.userId).then(setConversations).catch(() => setError("Couldn't load messages. Is the backend running?"));
  }, []);

  async function handleStartChat(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    if (!searchName.trim()) return;

    setSearching(true);
    try {
      const profile = await api.getProfileByName(searchName.trim());
      if (profile) {
        if (profile.user_id === identity.userId) {
          setSearchError("You can't message yourself.");
          return;
        }
        window.location.href = `/dm/${encodeURIComponent(profile.user_id)}`;
      } else {
        setSearchError("User not found. Check spelling of their anonymous name.");
      }
    } catch (err) {
      setSearchError("User not found.");
    } finally {
      setSearching(false);
    }
  }

  if (!isLoaded || !identity) {
    return (
      <main className="max-w-reading mx-auto px-4 py-16 text-center">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Finish onboarding to send messages.
        </p>
      </main>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-reading mx-auto px-4 py-12 space-y-6">
        <h1 className="text-2xl font-display text-text-primary">Messages</h1>

        {/* Search for user to message */}
        <Card className="p-5 border space-y-3" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
          <h2 className="text-sm font-medium text-text-primary">Start a new chat</h2>
          <form onSubmit={handleStartChat} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter anonymous name (e.g. DistantHummer_91)"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-sm border text-xs bg-transparent outline-none"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            />
            <Button variant="primary" type="submit" disabled={searching} className="text-xs px-4">
              {searching ? "Searching…" : "Chat"}
            </Button>
          </form>
          {searchError && (
            <p className="text-xs" style={{ color: "var(--accent-danger)" }}>
              {searchError}
            </p>
          )}
        </Card>

        {error && (
          <p className="text-sm" style={{ color: "var(--accent-danger)" }}>
            {error}
          </p>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Recent Chats</h2>
          {conversations && conversations.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              No conversations yet. Search a user above or click &ldquo;Message&rdquo; on any post or comment to start chatting.
            </p>
          ) : (
            <div className="space-y-2">
              {conversations?.map((c) => {
                const displayName = c.other_anonymous_name || c.other_user_id;
                return (
                  <Link key={c.conversation_id} href={`/dm/${c.other_user_id}`}>
                    <Card className="flex items-center gap-3 hover:opacity-90 transition-opacity p-4 border" style={{ borderColor: "var(--border-subtle)" }}>
                      <Avatar seed={displayName} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary">{displayName}</div>
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                          {c.last_message}
                        </p>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
                        {timeAgo(c.last_message_at)}
                      </span>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
