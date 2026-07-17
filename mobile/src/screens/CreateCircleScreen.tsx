import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography, radius } from "../theme/theme";
import { Button } from "../components/Button";
import { api } from "../lib/api";
import { getLocalIdentity } from "../lib/localIdentity";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ExploreStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<ExploreStackParamList, "CreateCircle">;

export function CreateCircleScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setError(null);
    const identity = await getLocalIdentity();
    if (!identity) {
      setError("Finish onboarding first.");
      return;
    }
    if (!name.trim()) {
      setError("Give the Circle a name.");
      return;
    }
    setSubmitting(true);
    try {
      const circle = await api.createCircle({ name, description, creator_id: identity.userId });
      try {
        await api.joinCircle(circle.circle_id, identity.userId);
      } catch (joinErr) {
        console.warn("Auto-joining created Circle failed:", joinErr);
      }
      navigation.replace("CircleDetail", { circleId: circle.circle_id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Start a Circle</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Circle names have to be unique — no two Circles can share a name.
      </Text>

      <TextInput
        placeholder="Circle name"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Circle name"
        value={name}
        onChangeText={setName}
        style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
      />
      <TextInput
        placeholder="What's this Circle for?"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Circle description"
        value={description}
        onChangeText={setDescription}
        multiline
        style={[styles.input, styles.textarea, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
      />

      {error && <Text style={{ color: colors.accentDanger, fontSize: typography.xs }}>{error}</Text>}

      <Button title={submitting ? "Creating…" : "Create Circle"} variant="primary" onPress={handleCreate} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.md },
  title: { fontSize: typography.xxl, fontWeight: "600" },
  subtitle: { fontSize: typography.sm, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, fontSize: typography.sm },
  textarea: { minHeight: 80, textAlignVertical: "top" },
});
