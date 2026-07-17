import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography, radius } from "../theme/theme";
import { Avatar } from "./Avatar";
import { Card } from "./Card";
import { NodPass } from "./NodPass";
import { ReportControl } from "./ReportControl";
import { ReadAloudButton } from "./ReadAloudButton";
import { api, Post } from "../lib/api";
import { getLocalIdentity } from "../lib/localIdentity";
import type { PostDetailParams } from "../navigation/sharedParams";

function timeAgo(unixMillis: number): string {
  const seconds = Math.floor((Date.now() - unixMillis) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Loosely typed on purpose: this card is used from both the Explore stack and
// the Feed stack, which have structurally identical but nominally different
// PostDetail param lists. Tying it to one specific stack's generated types
// would make it unusable from the other.
type NavProp = NativeStackNavigationProp<any>;

export function PostCard({ post, circleName }: { post: Post; circleName?: string }) {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();

  const [userId, setUserId] = useState<string | null>(null);
  const [nodCount, setNodCount] = useState(post.nod_count);
  const [passCount, setPassCount] = useState(post.pass_count);
  const [yourVote, setYourVote] = useState<"nod" | "pass" | null>(null);

  const isOwnPost = userId === post.author_id;

  useEffect(() => {
    getLocalIdentity().then((identity) => setUserId(identity?.userId ?? null));
  }, []);

  useEffect(() => {
    if (!userId || isOwnPost) return;
    api.getPostVote(post.circle_id, post.post_id, userId).then((r) => setYourVote(r.your_vote));
  }, [userId, isOwnPost, post.circle_id, post.post_id]);

  async function handleVote(vote: "nod" | "pass") {
    if (!userId || isOwnPost) return;
    const result = await api.voteOnPost(post.circle_id, post.post_id, userId, vote);
    setNodCount(result.nod_count);
    setPassCount(result.pass_count);
    setYourVote(result.your_vote);
  }

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={() => navigation.navigate("PostDetail", { circleId: post.circle_id, postId: post.post_id })}
        accessibilityRole="button"
        accessibilityLabel={`Open post: ${post.title}`}
      >
        <View style={{ gap: spacing.sm }}>
          <View style={styles.header}>
            <Avatar seed={post.author_id} size={32} />
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: "500" }}>
                {post.author_name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
                {circleName || post.circle_name || post.circle_id} · {timeAgo(post.created_at)}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{post.title}</Text>
          {!!post.body && (
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, lineHeight: 22 }} numberOfLines={4}>
              {post.body}
            </Text>
          )}

          {!!post.image_url && <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />}
        </View>
      </Pressable>

      <View style={styles.footer}>
        <NodPass
          nodCount={nodCount}
          passCount={passCount}
          yourVote={yourVote}
          onVote={handleVote}
          disabled={!userId || isOwnPost}
        />
        <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>{post.comment_count} replies</Text>
      </View>

      <View style={styles.secondaryRow}>
        <ReadAloudButton circleId={post.circle_id} postId={post.post_id} />
        {!isOwnPost && (
          <>
            <Pressable
              onPress={() => {
                navigation.navigate("Main", {
                  screen: "DmTab",
                  params: {
                    screen: "DmConversation",
                    params: { otherUserId: post.author_id }
                  }
                } as any);
              }}
              accessibilityRole="button"
              accessibilityLabel="Message author"
              style={{ paddingVertical: 2 }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>Message</Text>
            </Pressable>
            <ReportControl circleId={post.circle_id} targetType="post" targetId={post.post_id} postId={post.post_id} />
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontSize: typography.base, fontWeight: "500" },
  image: { width: "100%", height: 180, borderRadius: radius.md },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xs },
  secondaryRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginTop: spacing.xs },
});
