import React from "react";
import { Text, StyleSheet } from "react-native";
import { spacing, radius, typography } from "../theme/theme";
import { useTheme } from "../theme/ThemeContext";

/** Token — renamed badge per Glossary.md. Independent mobile implementation. */
export function TokenChip({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.chip, { backgroundColor: colors.tokenGold, color: "#3A2C0C" }]}>
      Token: {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    fontSize: typography.xs,
    fontWeight: "500",
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
});
