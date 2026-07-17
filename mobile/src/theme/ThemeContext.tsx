import React, { createContext, useContext, useState, useMemo } from "react";
import { darkColors, lightColors, ThemeColors } from "./theme";

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Dark-mode-first per docs/Design.md section 1 — default true, not derived
  // from system Appearance, matching the web app's default (ThemeToggle.tsx).
  const [isDark, setIsDark] = useState(true);

  const value = useMemo(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      toggleTheme: () => setIsDark((d) => !d),
    }),
    [isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
