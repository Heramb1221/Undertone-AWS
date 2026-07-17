import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography, radius } from "../theme/theme";
import { Button } from "../components/Button";
import { INTERESTS, InterestId } from "../lib/interests";
import { api } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingInterests">;

export function OnboardingInterestsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<InterestId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(id: InterestId) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function handleContinue() {
    setError(null);
    setLoading(true);
    try {
      const { name } = await api.generateName(selected);
      navigation.navigate("OnboardingIdentity", { interests: selected, initialName: name });
    } catch {
      setError("Couldn't reach the backend. Is it running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bgBase }} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>What are you into?</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Pick a few. Your anonymous name comes from these — pick none and we&apos;ll surprise you.
      </Text>

      <View style={styles.chips}>
        {INTERESTS.map((interest) => {
          const isSelected = selected.includes(interest.id);
          return (
            <Pressable
              key={interest.id}
              onPress={() => toggle(interest.id)}
              accessibilityRole="button"
              accessibilityLabel={interest.label}
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.chip,
                {
                  borderColor: isSelected ? colors.accentPrimary : colors.borderSubtle,
                  backgroundColor: isSelected ? colors.accentPrimary : "transparent",
                },
              ]}
            >
              <Text style={{ color: isSelected ? colors.onAccent : colors.textPrimary, fontSize: typography.sm }}>
                {interest.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error && <Text style={[styles.error, { color: colors.accentDanger }]}>{error}</Text>}

      <Button title={loading ? "…" : "Continue"} variant="primary" onPress={handleContinue} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: typography.xxl, fontWeight: "600" },
  subtitle: { fontSize: typography.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1 },
  error: { fontSize: typography.xs },
});
