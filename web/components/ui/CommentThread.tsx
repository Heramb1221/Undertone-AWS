"use client";

import { useState, useEffect } from "react";
import { CommentItem } from "./CommentItem";
import { Button } from "./Button";
import { api, Comment } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";

export function CommentThread({
  postId,
  circleId,
  initialComments,
}: {
  postId: string;
  circleId: string;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [newBody, setNewBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [identity, setIdentity] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIdentity(getLocalIdentity());
    setIsLoaded(true);
  }, []);

  async function refresh() {
    const fresh = await api.listComments(postId);
    setComments(fresh);
  }

  async function submitTopLevel() {
    if (!identity || !newBody.trim()) return;
    setSubmitting(true);
    try {
      await api.createComment(postId, {
        body: newBody,
        author_id: identity.userId,
        author_name: identity.name,
        parent_comment_id: null,
      });
      setNewBody("");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const topLevel = comments
    .filter((c) => c.parent_comment_id === null)
    .sort((a, b) => a.created_at - b.created_at);

  return (
    <div>
      {isLoaded && identity ? (
        <div className="space-y-2 mb-6 max-w-reading">
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={3}
            placeholder="Add a comment…"
            aria-label="Add a comment"
            className="w-full px-3 py-2 rounded-sm border text-sm bg-transparent outline-none"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          />
          <Button variant="primary" onClick={submitTopLevel} disabled={submitting}>
            {submitting ? "Posting…" : "Comment"}
          </Button>
        </div>
      ) : (
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Finish onboarding to join the conversation.
        </p>
      )}

      {topLevel.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No comments yet. Be the first.
        </p>
      )}

      {topLevel.map((comment) => (
        <CommentItem
          key={comment.comment_id}
          comment={comment}
          allComments={comments}
          depth={0}
          postId={postId}
          circleId={circleId}
          onReplyPosted={refresh}
        />
      ))}
    </div>
  );
}
