import React, { useCallback, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/theme";
import { PostCard } from "../components/PostCard";
import { CommentItem } from "../components/CommentItem";
import { Button } from "../components/Button";
import { api, Post, Comment } from "../lib/api";
import { getLocalIdentity, LocalIdentity } from "../lib/localIdentity";
import type { PostDetailParams } from "../navigation/sharedParams";

type Props = { route: { params: PostDetailParams } };

export function PostDetailScreen({ route }: Props) {
  const { circleId, postId } = route.params;
  const { colors } = useTheme();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newBody, setNewBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [identity, setIdentity] = useState<LocalIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [postData, commentsData] = await Promise.all([
        api.getPost(circleId, postId),
        api.listComments(postId),
      ]);
      setPost(postData);
      setComments(commentsData);
      setError(null);
    } catch {
      setError("Couldn't reach the backend. Is it running?");
    }
    const id = await getLocalIdentity();
    setIdentity(id);
  }, [circleId, postId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function submitTopLevel() {
    if (!identity || !newBody.trim()) return;
    setSubmitting(true);
    try {
      await api.createComment(postId, { body: newBody, author_id: identity.userId, author_name: identity.name, parent_comment_id: null });
      setNewBody("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  const topLevel = comments.filter((c) => c.parent_comment_id === null).sort((a, b) => a.created_at - b.created_at);

  return (
    <FlatList
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={styles.container}
      data={topLevel}
      keyExtractor={(c) => c.comment_id}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          {error && <Text style={{ color: colors.accentDanger }}>{error}</Text>}
          {post && <PostCard post={post} />}

          <Text style={[styles.commentsHeader, { color: colors.textPrimary }]}>Comments</Text>

          {identity ? (
            <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
              <TextInput
                value={newBody}
                onChangeText={setNewBody}
                placeholder="Add a comment…"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Add a comment"
                multiline
                style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
              />
              <Button title={submitting ? "Posting…" : "Comment"} variant="primary" onPress={submitTopLevel} loading={submitting} />
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary }}>Finish onboarding to join the conversation.</Text>
          )}

          {topLevel.length === 0 && (
            <Text style={{ color: colors.textSecondary }}>No comments yet. Be the first.</Text>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <CommentItem comment={item} allComments={comments} depth={0} postId={postId} circleId={circleId} onReplyPosted={load} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  commentsHeader: { fontSize: typography.lg, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 6, padding: spacing.sm, fontSize: typography.sm, minHeight: 70 },
});
