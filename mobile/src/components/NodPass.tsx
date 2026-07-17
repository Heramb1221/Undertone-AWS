import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/theme";

/**
 * Nod / Pass — renamed upvote/downvote per Glossary.md. Controlled component:
 * the parent (PostCard, CommentItem) owns vote state and talks to the real
 * backend — this just renders and reports taps. Independent implementation
 * from web/components/ui/NodPass.tsx per Q25 (fully separate codebases).
 */
export function NodPass({
  nodCount,
  passCount,
  yourVote,
  onVote,
  disabled = false,
}: {
  nodCount: number;
  passCount: number;
  yourVote: "nod" | "pass" | null;
  onVote: (vote: "nod" | "pass") => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const score = nodCount - passCount;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgElevated }]}>
      <Pressable
        onPress={() => onVote("nod")}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Nod"
        style={styles.button}
      >
        <Text style={{ color: yourVote === "nod" ? colors.accentPrimary : colors.textSecondary, fontSize: typography.xs, fontWeight: "500" }}>
          Nod
        </Text>
      </Pressable>
      <Text style={{ color: colors.textPrimary, fontSize: typography.xs, fontWeight: "500", minWidth: 20, textAlign: "center" }}>
        {score}
      </Text>
      <Pressable
        onPress={() => onVote("pass")}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Pass"
        style={styles.button}
      >
        <Text style={{ color: yourVote === "pass" ? colors.accentPass : colors.textSecondary, fontSize: typography.xs, fontWeight: "500" }}>
          Pass
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  button: { paddingVertical: spacing.xs / 2, paddingHorizontal: spacing.xs },
});
