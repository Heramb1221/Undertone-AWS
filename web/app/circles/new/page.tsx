"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";

export default function NewCirclePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);

    const identity = getLocalIdentity();
    if (!identity) {
      setError("Finish onboarding first so you have an identity to create Circles with.");
      return;
    }
    if (!name.trim()) {
      setError("Give the Circle a name.");
      return;
    }

    setSubmitting(true);
    try {
      const circle = await api.createCircle({ name, description, creator_id: identity.userId });
      try {
        await api.joinCircle(circle.circle_id, identity.userId);
      } catch (joinErr) {
        console.warn("Auto-joining created Circle failed:", joinErr);
      }
      router.push(`/circles/${circle.circle_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-reading mx-auto px-4 py-16 space-y-6">
      <div>
        <h1 className="text-2xl font-display text-text-primary mb-2">Start a Circle</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Circle names have to be unique — no two Circles can share a name.
        </p>
      </div>

      <div className="space-y-3">
        <input
          placeholder="Circle name"
          aria-label="Circle name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-sm border text-sm bg-transparent outline-none"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        />
        <textarea
          placeholder="What's this Circle for?"
          aria-label="Circle description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-sm border text-sm bg-transparent outline-none"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--accent-danger)" }}>
          {error}
        </p>
      )}

      <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Creating…" : "Create Circle"}
      </Button>
    </main>
  </>
  );
}
