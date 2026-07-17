"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Report, Post, Comment } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/timeAgo";
import { Header } from "@/components/ui/Header";

type TargetPreview = { kind: "post"; data: Post } | { kind: "comment"; data: Comment } | { kind: "missing" };

function ReportRow({
  circleId,
  report,
  onResolved,
}: {
  circleId: string;
  report: Report;
  onResolved: () => void;
}) {
  const [preview, setPreview] = useState<TargetPreview | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (report.target_type === "post") {
      api
        .getPost(circleId, report.target_id)
        .then((data) => setPreview({ kind: "post", data }))
        .catch(() => setPreview({ kind: "missing" }));
    } else {
      api
        .getComment(report.post_id, report.target_id)
        .then((data) => setPreview({ kind: "comment", data }))
        .catch(() => setPreview({ kind: "missing" }));
    }
  }, [circleId, report]);

  async function act(action: "remove" | "ban" | "dismiss") {
    setActing(true);
    try {
      await api.resolveReport(circleId, report.report_id, action);
      onResolved();
    } finally {
      setActing(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--accent-danger)" }}>
          {report.reason}
        </span>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {timeAgo(report.created_at)}
        </span>
      </div>

      {report.detail && (
        <p className="text-xs mb-2 italic" style={{ color: "var(--text-secondary)" }}>
          &ldquo;{report.detail}&rdquo;
        </p>
      )}

      <div className="p-2 rounded-sm mb-3" style={{ background: "var(--bg-elevated)" }}>
        {!preview && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Loading content…</p>}
        {preview?.kind === "missing" && (
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Content already removed.</p>
        )}
        {preview?.kind === "post" && (
          <>
            <div className="text-sm font-medium text-text-primary">{preview.data.title}</div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{preview.data.body}</p>
          </>
        )}
        {preview?.kind === "comment" && (
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{preview.data.body}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="danger" onClick={() => act("remove")} disabled={acting}>
          Remove
        </Button>
        <Button variant="danger" onClick={() => act("ban")} disabled={acting}>
          Ban author
        </Button>
        <Button variant="secondary" onClick={() => act("dismiss")} disabled={acting}>
          Dismiss
        </Button>
      </div>
    </Card>
  );
}

export default function ModerationQueuePage({ params }: { params: { id: string } }) {
  const [identity, setIdentity] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!identity) return;
    try {
      const data = await api.listReports(params.id, identity.userId, "open");
      setReports(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load reports.");
    }
  }

  useEffect(() => {
    const id = getLocalIdentity();
    setIdentity(id);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded && identity) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, identity]);

  if (!isLoaded || !identity) {
    return (
      <main className="max-w-reading mx-auto px-4 py-16 text-center">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Finish onboarding first.
        </p>
      </main>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-reading mx-auto px-4 py-12 space-y-6">
        <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display text-text-primary">Moderator queue</h1>
        <Link href={`/circles/${params.id}`} className="text-sm underline" style={{ color: "var(--accent-primary)" }}>
          Back to Circle
        </Link>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--accent-danger)" }}>
          {error} {error.includes("moderator") && "(only Circle moderators can view this queue)"}
        </p>
      )}

      {reports && reports.length === 0 && !error && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No open reports. Quiet in here.
        </p>
      )}

      <div className="space-y-4">
        {reports?.map((report) => (
          <ReportRow
            key={report.report_id}
            circleId={params.id}
            report={report}
            onResolved={refresh}
          />
        ))}
      </div>
    </main>
  </>
  );
}
