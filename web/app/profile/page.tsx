"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Profile, Token } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { TokenChip } from "@/components/ui/TokenChip";
import { Header } from "@/components/ui/Header";

export default function ProfilePage() {
  const [identity, setIdentity] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const id = getLocalIdentity();
    setIdentity(id);
    setIsLoaded(true);
    if (!id) return;
    api.getProfile(id.userId).then(setProfile).catch(() => setError("Couldn't load your profile. Is the backend running?"));
    api.getTokens(id.userId).then(setTokens).catch(() => {});
  }, []);

  if (!isLoaded || !identity) {
    return (
      <main className="max-w-reading mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Finish onboarding to see your profile.
        </p>
        <Link href="/onboarding" className="text-sm underline" style={{ color: "var(--accent-primary)" }}>
          Start onboarding →
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="max-w-reading mx-auto px-4 py-16 text-center">
          <p className="text-sm" style={{ color: "var(--accent-danger)" }}>
            {error}
          </p>
        </main>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Header />
        <main className="max-w-reading mx-auto px-4 py-16 text-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading profile…
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-reading mx-auto px-4 py-12 space-y-8">
        <div className="flex items-center gap-4">
          <Avatar seed={profile.anonymous_name} size={56} />
          <div>
            <h1 className="text-2xl font-display text-text-primary">{profile.anonymous_name}</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {profile.posts_count} posts · {profile.comments_count} comments
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
              Resonance
            </div>
            <div className="text-2xl font-semibold text-text-primary">{profile.resonance_score}</div>
          </Card>
          <Card>
            <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
              Rhythm
            </div>
            <div className="text-2xl font-semibold text-text-primary">
              {profile.rhythm_streak_days} {profile.rhythm_streak_days === 1 ? "day" : "days"}
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Tokens</h2>
          {tokens.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              None yet — Tokens unlock as you post, comment, and join Circles.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tokens.map((token) => (
                <TokenChip key={token.token_id} label={token.label} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
