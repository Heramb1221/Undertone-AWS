"use client";

import { useState, useEffect } from "react";
import { api, REPORT_REASONS } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";
import { Button } from "./Button";

export function ReportControl({
  circleId,
  targetType,
  targetId,
  postId,
}: {
  circleId: string;
  targetType: "post" | "comment";
  targetId: string;
  postId: string;
}) {
  const [identity, setIdentity] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setIdentity(getLocalIdentity());
    setIsLoaded(true);
  }, []);

  if (!isLoaded || !identity) return null;

  if (submitted) {
    return (
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Reported.
      </span>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Report
      </button>
    );
  }

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    try {
      await api.createReport(circleId, {
        reporter_id: identity!.userId,
        target_type: targetType,
        target_id: targetId,
        post_id: postId,
        reason,
        detail,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 p-3 rounded-sm border max-w-xs" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
        Why are you reporting this?
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {REPORT_REASONS.map((r) => (
          <button
            key={r}
            onClick={() => setReason(r)}
            className="text-xs px-2 py-1 rounded-sm border"
            style={{
              borderColor: reason === r ? "var(--accent-danger)" : "var(--border-subtle)",
              color: reason === r ? "var(--accent-danger)" : "var(--text-secondary)",
            }}
          >
            {r}
          </button>
        ))}
      </div>
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="Anything else moderators should know? (optional)"
        aria-label="Additional report details (optional)"
        rows={2}
        className="w-full px-2 py-1.5 rounded-sm border text-xs bg-transparent outline-none mb-2"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
      />
      <div className="flex gap-2">
        <Button variant="danger" onClick={submit} disabled={!reason || submitting}>
          {submitting ? "Submitting…" : "Submit report"}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
