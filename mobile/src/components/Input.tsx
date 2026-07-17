import React from "react";
import { TextInput, StyleSheet, TextInputProps } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, radius, typography } from "../theme/theme";

export function Input(props: TextInputProps & { accessibilityLabel: string }) {
  const { colors } = useTheme();

  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      style={[
        styles.base,
        { borderColor: colors.borderSubtle, color: colors.textPrimary, backgroundColor: "transparent" },
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: typography.sm,
  },
});
