"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NodPass } from "@/components/ui/NodPass";
import { TokenChip } from "@/components/ui/TokenChip";
import { CircleChip } from "@/components/ui/CircleChip";
import { Avatar } from "@/components/ui/Avatar";
import { PostCard } from "@/components/ui/PostCard";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function DesignSystemPage() {
  const [demoVote, setDemoVote] = useState<"nod" | "pass" | null>(null);
  const [demoNod, setDemoNod] = useState(128);
  const [demoPass, setDemoPass] = useState(4);

  function handleDemoVote(vote: "nod" | "pass") {
    if (demoVote === vote) {
      setDemoVote(null);
      if (vote === "nod") setDemoNod((n) => n - 1);
      else setDemoPass((p) => p - 1);
      return;
    }
    if (demoVote === "nod") setDemoNod((n) => n - 1);
    if (demoVote === "pass") setDemoPass((p) => p - 1);
    if (vote === "nod") setDemoNod((n) => n + 1);
    else setDemoPass((p) => p + 1);
    setDemoVote(vote);
  }

  return (
    <main className="max-w-reading mx-auto px-4 py-12 space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display text-text-primary">Undertone — Design System</h1>
        <ThemeToggle />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Buttons</h2>
        <div className="flex gap-3">
          <Button variant="primary">Post</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="danger">Leave Circle</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Nod / Pass (local demo state — real posts hit the backend)</h2>
        <NodPass nodCount={demoNod} passCount={demoPass} yourVote={demoVote} onVote={handleDemoVote} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Chips &amp; Tokens</h2>
        <div className="flex gap-3">
          <CircleChip name="Book Nook" />
          <TokenChip label="Deep Reader" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Avatars (DiceBear, seeded)</h2>
        <div className="flex gap-3">
          <Avatar seed="MoonlitReader_42" />
          <Avatar seed="QuietCoder_7" />
          <Avatar seed="SlowMorning_19" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Post card (composed — voting disabled here, no real post/circle id)</h2>
        <PostCard
          circleId="demo-circle"
          postId="demo-post"
          authorId="MoonlitReader_42"
          authorName="MoonlitReader_42"
          circle="Book Nook"
          timeAgo="4h ago"
          title="Anyone else re-read comfort books instead of trying new ones?"
          body="I've read the same three novels probably twenty times each this year. Feels safer than the unknown somehow."
          initialNodCount={128}
          initialPassCount={4}
          replyCount={32}
          token="Deep Reader"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Surface / Card</h2>
        <Card>
          <p className="text-sm text-text-primary">A bare Card — base surface for any bounded content.</p>
        </Card>
      </section>
    </main>
  );
}
