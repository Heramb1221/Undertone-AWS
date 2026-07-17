import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/theme";
import { Avatar } from "./Avatar";
import { NodPass } from "./NodPass";
import { ReportControl } from "./ReportControl";
import { Button } from "../components/Button";
import { api, Comment } from "../lib/api";
import { getLocalIdentity, LocalIdentity } from "../lib/localIdentity";

// Spacing.md: "Comment nesting caps at 2 visible levels on mobile before
// 'continue thread' (tighter than web, screen-width constraint)." Web uses 3.
const MAX_VISUAL_DEPTH = 2;

function timeAgo(unixMillis: number): string {
  const seconds = Math.floor((Date.now() - unixMillis) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

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
  const { colors } = useTheme();
  const [identity, setIdentity] = useState<LocalIdentity | null>(null);
  const [nodCount, setNodCount] = useState(comment.nod_count);
  const [passCount, setPassCount] = useState(comment.pass_count);
  const [yourVote, setYourVote] = useState<"nod" | "pass" | null>(null);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const userId = identity?.userId ?? null;
  const isOwnComment = userId === comment.author_id;
  const children = allComments
    .filter((c) => c.parent_comment_id === comment.comment_id)
    .sort((a, b) => a.created_at - b.created_at);

  const isDeep = depth >= MAX_VISUAL_DEPTH;
  const [collapsed, setCollapsed] = useState(isDeep && children.length > 0);

  useEffect(() => {
    getLocalIdentity().then(setIdentity);
  }, []);

  useEffect(() => {
    if (!userId || isOwnComment) return;
    api.getCommentVote(postId, comment.comment_id, userId).then((r) => setYourVote(r.your_vote));
  }, [userId, isOwnComment, postId, comment.comment_id]);

  async function handleVote(vote: "nod" | "pass") {
    if (!userId || isOwnComment) return;
    const result = await api.voteOnComment(postId, comment.comment_id, userId, vote);
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

  const indent = Math.min(depth, MAX_VISUAL_DEPTH) * spacing.md;

  return (
    <View style={{ marginLeft: depth > 0 ? indent : 0, marginTop: depth > 0 ? spacing.sm : spacing.md }}>
      {depth > 0 && <View style={[styles.threadLine, { backgroundColor: colors.borderSubtle }]} />}
      <View style={depth > 0 ? { paddingLeft: spacing.sm } : undefined}>
        <View style={styles.header}>
          <Avatar seed={comment.author_id} size={20} />
          <Text style={{ color: colors.textPrimary, fontSize: typography.xs, fontWeight: "500" }}>
            {comment.author_name}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>{timeAgo(comment.created_at)}</Text>
        </View>

        <Text style={{ color: colors.textPrimary, fontSize: typography.sm, marginTop: 2, marginBottom: spacing.xs }}>
          {comment.body}
        </Text>

        <View style={styles.actionsRow}>
          <NodPass
            nodCount={nodCount}
            passCount={passCount}
            yourVote={yourVote}
            onVote={handleVote}
            disabled={!userId || isOwnComment}
          />
          {userId && (
            <Pressable onPress={() => setReplying(!replying)}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>Reply</Text>
            </Pressable>
          )}
          {!isOwnComment && userId && (
            <ReportControl circleId={circleId} targetType="comment" targetId={comment.comment_id} postId={postId} />
          )}
        </View>

        {replying && (
          <View style={styles.replyBox}>
            <TextInput
              value={replyBody}
              onChangeText={setReplyBody}
              placeholder="Write a reply…"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Write a reply"
              multiline
              style={[styles.replyInput, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
            />
            <View style={styles.replyActions}>
              <Button title={submitting ? "Posting…" : "Reply"} variant="primary" onPress={submitReply} loading={submitting} />
              <Button title="Cancel" variant="secondary" onPress={() => setReplying(false)} />
            </View>
          </View>
        )}

        {children.length > 0 && collapsed && (
          <Pressable onPress={() => setCollapsed(false)}>
            <Text style={{ color: colors.accentPrimary, fontSize: typography.xs, marginTop: spacing.xs }}>
              Continue thread ({children.length})
            </Text>
          </Pressable>
        )}

        {children.length > 0 &&
          !collapsed &&
          children.map((child) => (
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  replyBox: { marginTop: spacing.sm, gap: spacing.xs },
  replyInput: { borderWidth: 1, borderRadius: 6, padding: spacing.sm, fontSize: typography.sm, minHeight: 60 },
  replyActions: { flexDirection: "row", gap: spacing.sm },
  threadLine: { position: "absolute", left: 0, top: 0, bottom: 0, width: 1 },
});
