import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/theme";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { PostCard } from "../components/PostCard";
import { api, Circle, Post } from "../lib/api";
import { getLocalIdentity } from "../lib/localIdentity";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ExploreStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<ExploreStackParamList, "CircleDetail">;

export function CircleDetailScreen({ route, navigation }: Props) {
  const { circleId } = route.params;
  const { colors } = useTheme();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [joined, setJoined] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLocalIdentity().then((identity) => setUserId(identity?.userId ?? null));
  }, []);

  const load = useCallback(async () => {
    try {
      const [circleData, postsData] = await Promise.all([api.getCircle(circleId), api.listPostsForCircle(circleId)]);
      setCircle(circleData);
      setPosts(postsData);
      setError(null);
    } catch {
      setError("Couldn't reach the backend. Is it running?");
    }
  }, [circleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (userId) api.getJoinedCircles(userId).then((ids) => setJoined(ids.includes(circleId)));
  }, [userId, circleId]);

  async function toggleJoin() {
    if (!userId) return;
    if (joined) {
      await api.leaveCircle(circleId, userId);
      setJoined(false);
    } else {
      await api.joinCircle(circleId, userId);
      setJoined(true);
    }
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase, justifyContent: "center" }]}>
        <Text style={{ color: colors.accentDanger, textAlign: "center" }}>{error}</Text>
      </View>
    );
  }

  if (!circle) return null;

  return (
    <FlatList
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={styles.list}
      data={posts}
      keyExtractor={(p) => p.post_id}
      renderItem={({ item }) => <PostCard post={item} circleName={circle.name} />}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{circle.name}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing.md }}>
            {circle.description || "No description yet."}
          </Text>
          {userId && joined !== null && (
            <Button
              title={joined ? "Leave Circle" : "Join Circle"}
              variant={joined ? "secondary" : "primary"}
              onPress={toggleJoin}
            />
          )}
          <Card style={styles.modCard}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
              {circle.moderator_ids.length} moderator{circle.moderator_ids.length !== 1 ? "s" : ""}
            </Text>
          </Card>
          {!!userId && circle.moderator_ids.includes(userId) && (
            <Button title="Moderator queue" variant="secondary" onPress={() => navigation.navigate("ModerationQueue", { circleId })} />
          )}
          <View style={styles.postsHeaderRow}>
            <Text style={[styles.postsHeader, { color: colors.textPrimary }]}>Posts</Text>
            {userId && <Button title="New post" variant="primary" onPress={() => navigation.navigate("NewPost", { circleId })} />}
          </View>
          {posts.length === 0 && (
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
              Nothing posted here yet.
            </Text>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.lg },
  headerBlock: { gap: spacing.md, marginBottom: spacing.md },
  title: { fontSize: typography.xxl, fontWeight: "600" },
  modCard: { marginTop: spacing.sm },
  postsHeader: { fontSize: typography.lg, fontWeight: "600", marginTop: spacing.md },
  postsHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
});
