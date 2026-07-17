import React from "react";
import { Image, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";

/** Deterministic DiceBear avatar from an Anonymous Identity seed. Same seed,
 * same avatar, always — no photo upload, ever. See docs/Design.md section 5. */
export function Avatar({ seed, size = 40 }: { seed: string; size?: number }) {
  const { colors } = useTheme();
  const uri = `https://api.dicebear.com/9.x/lorelei/png?seed=${encodeURIComponent(seed)}&size=${size * 2}`;

  return (
    <Image
      source={{ uri }}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.bgElevated }]}
      accessibilityLabel=""
    />
  );
}

const styles = StyleSheet.create({
  image: {},
});
