"use client";

import { useState } from "react";
import Link from "next/link";
import { INTERESTS, InterestId } from "@/lib/nameGenerator";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { signUp, confirmSignUp, signIn, getCurrentUserSub } from "@/lib/cognito";
import { saveLocalIdentity } from "@/lib/localIdentity";
import { api } from "@/lib/api";

type Step = "interests" | "identity" | "account" | "verify" | "done";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("interests");
  const [selected, setSelected] = useState<InterestId[]>([]);
  const [name, setName] = useState<string>("");
  const [editingName, setEditingName] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleInterest(id: InterestId) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function rerollName(): Promise<boolean> {
    try {
      const res = await fetch("/api/generate-name", {
        method: "POST",
        body: JSON.stringify({ interests: selected }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setName(data.name);
      setError(null);
      return true;
    } catch {
      setError("Couldn't generate a name — try again.");
      return false;
    }
  }

  async function goToIdentity() {
    const ok = await rerollName();
    if (ok) setStep("identity");
  }

  async function handleCreateAccount() {
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email, password);
      setStep("verify");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Cognito isn't configured yet — run `python infra/scripts/manage.py up` first (see README.md).";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    setError(null);
    setSubmitting(true);
    try {
      if (!verificationCode.trim()) {
        throw new Error("Please enter the verification code.");
      }
      await confirmSignUp(email, verificationCode);

      let sub: string | null = null;
      try {
        await signIn(email, password);
        sub = await getCurrentUserSub();
      } catch (signInErr) {
        console.warn("Auto sign-in failed:", signInErr);
      }

      const finalUserId = sub || name;

      try {
        await api.createProfile({
          user_id: finalUserId,
          anonymous_name: name,
          interests: selected,
        });
      } catch (profileErr) {
        console.warn("Backend profile creation failed:", profileErr);
      }

      saveLocalIdentity({ name, avatarSeed: name, userId: finalUserId });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-reading mx-auto px-4 py-16 min-h-screen flex flex-col justify-center">
      {step === "interests" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-display text-text-primary mb-2">What are you into?</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Pick a few. Your anonymous name comes from these — pick none and we&apos;ll surprise you.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => {
              const isSelected = selected.includes(interest.id);
              return (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className="text-sm px-3 py-2 rounded-sm border transition-colors"
                  style={{
                    borderColor: isSelected ? "var(--accent-primary)" : "var(--border-subtle)",
                    background: isSelected ? "var(--accent-primary)" : "transparent",
                    color: isSelected ? "#2B1608" : "var(--text-primary)",
                  }}
                >
                  {interest.label}
                </button>
              );
            })}
          </div>
          <Button variant="primary" onClick={goToIdentity}>
            Continue
          </Button>
          {error && (
            <p className="text-xs" style={{ color: "var(--accent-danger)" }}>
              {error}
            </p>
          )}
        </div>
      )}

      {step === "identity" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-display text-text-primary mb-2">This is you here</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Nobody sees your real name. Reroll or edit until it feels right.
            </p>
          </div>

          <Card className="flex items-center gap-4">
            <Avatar seed={name} size={56} />
            <div className="flex-1">
              {editingName ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  aria-label="Anonymous name"
                  autoFocus
                  className="text-lg font-medium bg-transparent border-b outline-none w-full"
                  style={{ borderColor: "var(--accent-primary)", color: "var(--text-primary)" }}
                />
              ) : (
                <div
                  className="text-lg font-medium cursor-pointer"
                  style={{ color: "var(--text-primary)" }}
                  onClick={() => setEditingName(true)}
                >
                  {name}
                </div>
              )}
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                tap the name to edit
              </span>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={rerollName}>
              Reroll
            </Button>
            <Button variant="primary" onClick={() => setStep("account")}>
              This is me
            </Button>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--accent-danger)" }}>
              {error}
            </p>
          )}
        </div>
      )}

      {step === "account" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-display text-text-primary mb-2">One last thing</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              An email and password to keep this account yours. We never ask for your real name.
            </p>
          </div>

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

          <Button variant="primary" onClick={handleCreateAccount} disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-display text-text-primary mb-2">Verify your email</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              We sent a verification code to <strong>{email}</strong>. Enter it below to activate your account.
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Verification Code"
              aria-label="Verification Code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full px-3 py-2 rounded-sm border text-sm bg-transparent outline-none"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--accent-danger)" }}>
              {error}
            </p>
          )}

          <Button variant="primary" onClick={handleVerifyCode} disabled={submitting}>
            {submitting ? "Verifying…" : "Confirm code"}
          </Button>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-6 text-center flex flex-col items-center">
          <Avatar seed={name} size={64} />
          <h1 className="text-2xl font-display text-text-primary">Welcome, {name}.</h1>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
            Your account is verified and your anonymous identity is set up. Let&apos;s get started!
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/feed">
              <Button variant="primary">Go to Feed</Button>
            </Link>
            <Link href="/circles">
              <Button variant="secondary">Explore Circles</Button>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
