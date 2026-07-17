import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/theme";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { api } from "../lib/api";
import { getCurrentUserId } from "../lib/cognito";
import { saveLocalIdentity } from "../lib/localIdentity";
import { registerForPushNotificationsAsync } from "../lib/pushNotifications";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingIdentity">;

export function OnboardingIdentityScreen({ route, navigation }: Props) {
  const { interests, initialName } = route.params;
  const { colors } = useTheme();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function reroll() {
    try {
      const { name: newName } = await api.generateName(interests);
      setName(newName);
    } catch {
      setError("Couldn't reroll — try again.");
    }
  }

  async function confirm() {
    setError(null);
    setSubmitting(true);
    try {
      const userId = await getCurrentUserId();
      await api.createIdentity({ user_id: userId, anonymous_name: name, avatar_seed: name, interests });
      await saveLocalIdentity({ userId, name, avatarSeed: name });
      registerForPushNotificationsAsync()
        .then((token) => (token ? api.registerPushToken(userId, token, "expo") : undefined))
        .catch(() => {});
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgBase }]} edges={["top", "bottom", "left", "right"]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>This is you here</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Nobody sees your real name. Reroll or edit until it feels right.
      </Text>

      <Card style={styles.identityCard}>
        <Avatar seed={name} size={56} />
        <TextInput
          value={name}
          onChangeText={setName}
          accessibilityLabel="Anonymous name"
          style={[styles.nameInput, { color: colors.textPrimary, borderColor: colors.borderSubtle }]}
        />
      </Card>

      {error && <Text style={[styles.error, { color: colors.accentDanger }]}>{error}</Text>}

      <View style={styles.actions}>
        <Button title="Reroll" variant="secondary" onPress={reroll} />
        <Button title={submitting ? "Saving…" : "This is me"} variant="primary" onPress={confirm} loading={submitting} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.lg, justifyContent: "center" },
  title: { fontSize: typography.xxl, fontWeight: "600" },
  subtitle: { fontSize: typography.sm },
  identityCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  nameInput: { flex: 1, fontSize: typography.lg, fontWeight: "500", borderBottomWidth: 1, paddingVertical: spacing.xs },
  actions: { flexDirection: "row", gap: spacing.sm },
  error: { fontSize: typography.xs },
});
