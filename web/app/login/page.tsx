"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, getCurrentUserSub } from "@/lib/cognito";
import { saveLocalIdentity } from "@/lib/localIdentity";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Sign in to Cognito User Pool
      await signIn(email, password);
      
      // 2. Fetch Cognito sub ID
      const sub = await getCurrentUserSub();
      if (!sub) {
        throw new Error("Unable to retrieve user information from session.");
      }

      // 3. Fetch user profile from DynamoDB using the sub
      let profile;
      try {
        profile = await api.getProfile(sub);
      } catch (profileErr) {
        throw new Error("Couldn't find your profile. Is the backend running?");
      }

      if (!profile) {
        throw new Error("Profile not found in database.");
      }

      // 4. Save to local identity
      saveLocalIdentity({
        name: profile.anonymous_name,
        avatarSeed: profile.avatar_seed || profile.anonymous_name,
        userId: sub,
      });

      // 5. Redirect to feed
      window.location.href = "/feed";
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-24 min-h-screen flex flex-col justify-center">
      <Card className="space-y-6 p-8 border" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}>
        <div className="text-center">
          <h1 className="text-3xl font-display text-text-primary mb-2">undertone</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Welcome back. Please log in to your account.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              placeholder="you@example.com"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-sm border text-sm bg-transparent outline-none"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            />
            <input
              type="password"
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-sm border text-sm bg-transparent outline-none"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--accent-danger)" }}>
              {error}
            </p>
          )}

          <Button variant="primary" type="submit" disabled={submitting} className="w-full">
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <div className="text-center space-y-2 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            New to undertone?{" "}
            <Link href="/onboarding" className="underline font-medium" style={{ color: "var(--accent-primary)" }}>
              Onboard now →
            </Link>
          </p>
          <Link href="/" className="block text-xs underline" style={{ color: "var(--text-secondary)" }}>
            Back to Home
          </Link>
        </div>
      </Card>
    </main>
  );
}
