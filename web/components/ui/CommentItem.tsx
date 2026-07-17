"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { NodPass } from "./NodPass";
import { Button } from "./Button";
import { ReportControl } from "./ReportControl";
import { api, Comment } from "@/lib/api";
import { getLocalIdentity } from "@/lib/localIdentity";
import { timeAgo } from "@/lib/timeAgo";

const MAX_VISUAL_DEPTH = 3; // Spacing.md section 2 — collapse past 3 levels

export function CommentItem({
  comment,
  allComments,
  depth,
  postId,
  circleId,
  onReplyPosted,
}: {
  comment: Comment;
  allComments: Comment[];
  depth: number;
  postId: string;
  circleId: string;
  onReplyPosted: () => void;
}) {
  const [identity, setIdentity] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isOwnComment = identity?.userId === comment.author_id;

  const [nodCount, setNodCount] = useState(comment.nod_count);
  const [passCount, setPassCount] = useState(comment.pass_count);
  const [yourVote, setYourVote] = useState<"nod" | "pass" | null>(null);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const children = allComments
    .filter((c) => c.parent_comment_id === comment.comment_id)
    .sort((a, b) => a.created_at - b.created_at);

  const isDeep = depth >= MAX_VISUAL_DEPTH;
  const [collapsed, setCollapsed] = useState(isDeep && children.length > 0);

  useEffect(() => {
    const id = getLocalIdentity();
    setIdentity(id);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || !identity || isOwnComment) return;
    api.getCommentVote(postId, comment.comment_id, identity.userId).then((r) => setYourVote(r.your_vote));
  }, [postId, comment.comment_id, isLoaded, identity, isOwnComment]);

  async function handleVote(vote: "nod" | "pass") {
    if (!identity || isOwnComment) return;
    const result = await api.voteOnComment(postId, comment.comment_id, identity.userId, vote);
    setNodCount(result.nod_count);
    setPassCount(result.pass_count);
    setYourVote(result.your_vote);
  }

  async function submitReply() {
    if (!identity || !replyBody.trim()) return;
    setSubmitting(true);
    try {
      await api.createComment(postId, {
        body: replyBody,
        author_id: identity.userId,
        author_name: identity.name,
        parent_comment_id: comment.comment_id,
      });
      setReplyBody("");
      setReplying(false);
      onReplyPosted();
    } finally {
      setSubmitting(false);
    }
  }

  const indent = Math.min(depth, MAX_VISUAL_DEPTH) * 16; // 16px = space-4, per Spacing.md

  return (
    <div
      className={depth > 0 ? "mt-3 pl-3 border-l" : "mt-4"}
      style={depth > 0 ? { marginLeft: indent, borderColor: "var(--border-subtle)" } : undefined}
    >
      <div className="flex items-center gap-2 mb-1">
        <Avatar seed={comment.author_id} size={22} />
        <span className="text-xs font-medium text-text-primary">{comment.author_name}</span>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {timeAgo(comment.created_at)}
        </span>
      </div>

      <p className="text-sm mb-2" style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>
        {comment.body}
      </p>

      <div className="flex items-center gap-3 mb-2">
        <NodPass
          nodCount={nodCount}
          passCount={passCount}
          yourVote={yourVote}
          onVote={handleVote}
          disabled={!isLoaded || !identity || isOwnComment}
        />
        {isLoaded && identity && (
          <button
            onClick={() => setReplying(!replying)}
            className="text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            Reply
          </button>
        )}
        {isLoaded && !isOwnComment && identity && (
          <ReportControl circleId={circleId} targetType="comment" targetId={comment.comment_id} postId={postId} />
        )}
      </div>

      {replying && (
        <div className="mb-3 space-y-2 max-w-sm">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={2}
            placeholder="Write a reply…"
            aria-label="Write a reply"
            className="w-full px-2 py-1.5 rounded-sm border text-sm bg-transparent outline-none"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          />
          <div className="flex gap-2">
            <Button variant="primary" onClick={submitReply} disabled={submitting}>
              {submitting ? "Posting…" : "Reply"}
            </Button>
            <Button variant="secondary" onClick={() => setReplying(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {children.length > 0 && collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="text-xs mb-2"
          style={{ color: "var(--accent-primary)" }}
        >
          Continue thread ({children.length})
        </button>
      )}

      {children.length > 0 && !collapsed && (
        <div>
          {children.map((child) => (
            <CommentItem
              key={child.comment_id}
              comment={child}
              allComments={allComments}
              depth={depth + 1}
              postId={postId}
              circleId={circleId}
              onReplyPosted={onReplyPosted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
