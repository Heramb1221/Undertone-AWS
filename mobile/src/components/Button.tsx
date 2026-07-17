import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, GestureResponderEvent } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing, radius, typography } from "../theme/theme";

type Variant = "primary" | "secondary" | "danger";

export function Button({
  title,
  onPress,
  variant = "secondary",
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();

  const variantStyle = {
    primary: { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
    secondary: { backgroundColor: "transparent", borderColor: colors.borderSubtle },
    danger: { backgroundColor: "transparent", borderColor: colors.accentDanger },
  }[variant];

  const textColor = {
    primary: colors.onAccent,
    secondary: colors.textPrimary,
    danger: colors.accentDanger,
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        { opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.text, { color: textColor }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: typography.sm,
    fontWeight: "500",
  },
});
