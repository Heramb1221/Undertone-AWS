"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLocalIdentity } from "@/lib/localIdentity";

export default function Home() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const identity = getLocalIdentity();
    if (identity) {
      window.location.href = "/feed";
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading undertone…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 text-center px-4 max-w-md mx-auto">
      <h1 className="text-5xl font-display text-text-primary mb-2 font-bold tracking-tight">undertone</h1>
      <p className="text-base max-w-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
        A place to share thoughts, join conversations, and build Circles, completely pseudonymously. No real names. No tracking.
      </p>
      
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/onboarding" className="w-full text-sm font-medium py-3 rounded-md transition-colors" style={{ background: "var(--accent-primary)", color: "#2B1608" }}>
          Onboard / Create Identity
        </Link>
        <Link href="/login" className="w-full text-sm font-medium py-3 rounded-md border transition-colors hover:opacity-90" style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)", background: "var(--bg-elevated)" }}>
          Log In
        </Link>
      </div>

      <div className="pt-8 border-t w-full text-xs" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
        <Link href="/design-system" className="underline hover:text-text-primary">
          Explore Design System
        </Link>
      </div>
    </main>
  );
}
