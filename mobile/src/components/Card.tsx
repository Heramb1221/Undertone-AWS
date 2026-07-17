import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, radius } from "../theme/theme";

export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.base, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});
