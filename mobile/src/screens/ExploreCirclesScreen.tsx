import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/theme";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { api, Circle } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ExploreStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<ExploreStackParamList, "ExploreCircles">;

export function ExploreCirclesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [circles, setCircles] = useState<Circle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setCircles(await api.listCircles());
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
        <Text style={[styles.header, { color: colors.textPrimary }]}>Explore Circles</Text>
        <Button title="Create" variant="primary" onPress={() => navigation.navigate("CreateCircle")} />
      </View>

      {error && <Text style={{ color: colors.accentDanger, paddingHorizontal: spacing.lg }}>{error}</Text>}
      {circles && circles.length === 0 && !error && (
        <Text style={{ color: colors.textSecondary, paddingHorizontal: spacing.lg }}>
          No Circles yet. Be the first to start one.
        </Text>
      )}

      <FlatList
        data={circles ?? []}
        keyExtractor={(c) => c.circle_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("CircleDetail", { circleId: item.circle_id })}>
            <Card style={styles.circleCard}>
              <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: "500" }}>
                {item.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm }} numberOfLines={2}>
                {item.description || "No description yet."}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  header: { fontSize: typography.xl, fontWeight: "600" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  circleCard: { gap: spacing.xs, marginBottom: spacing.md },
});
