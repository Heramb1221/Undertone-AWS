import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/theme";
import { PostCard } from "../components/PostCard";
import { api, Post } from "../lib/api";
import { getLocalIdentity } from "../lib/localIdentity";

export function FeedScreen() {
  const { colors, toggleTheme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const identity = await getLocalIdentity();
    if (!identity) return;
    try {
      const data = await api.getFeed(identity.userId);
      setPosts(data);
      setError(null);
    } catch {
      setError("Couldn't reach the backend. Is it running?");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgBase }]} edges={["top", "left", "right"]}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: colors.textPrimary }]}>Your feed</Text>
        <Pressable onPress={toggleTheme} style={[styles.themeBtn, { borderColor: colors.borderSubtle }]}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.xs }}>
            {isDark ? "Light Mode" : "Dark Mode"}
          </Text>
        </Pressable>
      </View>

      {error && <Text style={{ color: colors.accentDanger, paddingHorizontal: spacing.lg }}>{error}</Text>}

      {posts && posts.length === 0 && !error && (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xs, marginBottom: spacing.md }}>
          <Pressable onPress={() => navigation.navigate("ExploreTab")}>
            <Text style={{ color: colors.accentPrimary, fontSize: typography.sm, fontWeight: "600" }}>
              Explore Circles →
            </Text>
          </Pressable>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
            Nothing here yet. Join a Circle to start seeing posts.
          </Text>
        </View>
      )}

      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => p.post_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <PostCard post={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: typography.xl, fontWeight: "600", padding: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: spacing.lg,
  },
  themeBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
