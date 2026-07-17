import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/theme";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { TokenChip } from "../components/TokenChip";
import { Button } from "../components/Button";
import { api, Profile, Token } from "../lib/api";
import { getLocalIdentity, clearLocalIdentity } from "../lib/localIdentity";
import { signOut } from "../lib/cognito";
import { resetToLogin } from "../navigation/navigationRef";

export function ProfileScreen() {
  const { colors, toggleTheme, isDark } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const identity = await getLocalIdentity();
    if (!identity) return;
    try {
      const [profileData, tokensData] = await Promise.all([
        api.getProfile(identity.userId),
        api.getTokens(identity.userId),
      ]);
      setProfile(profileData);
      setTokens(tokensData);
      setError(null);
    } catch {
      setError("Couldn't load your profile. Is the backend running?");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSignOut() {
    signOut();
    await clearLocalIdentity();
    resetToLogin();
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <Text style={{ color: colors.accentDanger }}>{error}</Text>
      </View>
    );
  }

  if (!profile) {
    return <View style={[styles.center, { backgroundColor: colors.bgBase }]} />;
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bgBase }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar seed={profile.anonymous_name} size={56} />
        <View>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{profile.anonymous_name}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
            {profile.posts_count} posts · {profile.comments_count} comments
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>Resonance</Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.xl, fontWeight: "600" }}>
            {profile.resonance_score}
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>Rhythm</Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.xl, fontWeight: "600" }}>
            {profile.rhythm_streak_days} {profile.rhythm_streak_days === 1 ? "day" : "days"}
          </Text>
        </Card>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tokens</Text>
      {tokens.length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
          None yet — Tokens unlock as you post, comment, and join Circles.
        </Text>
      ) : (
        <FlatList
          data={tokens}
          horizontal
          keyExtractor={(t) => t.token_id}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item }) => <TokenChip label={item.label} />}
        />
      )}

      <View style={styles.footer}>
        <Button title={`Switch to ${isDark ? "light" : "dark"} mode`} variant="secondary" onPress={toggleTheme} />
        <Button title="Sign out" variant="danger" onPress={handleSignOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: spacing.xl, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { fontSize: typography.xl, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: spacing.md },
  statCard: { flex: 1, gap: spacing.xs },
  sectionTitle: { fontSize: typography.lg, fontWeight: "600" },
  footer: { gap: spacing.sm, marginTop: spacing.lg },
});
