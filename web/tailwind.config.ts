import type { Config } from "tailwindcss";

// Every value here is sourced directly from docs/Colour.md, Typography.md, and Spacing.md.
// If you change a value in those docs, mirror it here — they're meant to stay in lockstep.

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // FIXED in Phase 13: these previously pointed at static dark-theme hex values,
        // meaning every `text-text-primary`/`bg-elevated`/etc. class was frozen to dark
        // mode regardless of theme — in light mode, cream text would render on a cream
        // background. Now these resolve through the CSS vars in globals.css, which DO
        // switch between :root (dark, default) and .light — matching how the ~15 spots
        // using inline `style={{ color: "var(--text-primary)" }}` already worked correctly.
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        "border-subtle": "var(--border-subtle)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "accent-primary": "var(--accent-primary)",
        "accent-secondary": "var(--accent-secondary)",
        "accent-nod": "var(--accent-primary)",
        "accent-pass": "var(--accent-pass)",
        "accent-danger": "var(--accent-danger)",
        "token-gold": "var(--token-gold)",
      },
      fontFamily: {
        // Typography.md section 1
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
      fontSize: {
        // Typography.md section 2
        xs: ["0.75rem", { lineHeight: "1.4" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.6" }],
        lg: ["1.125rem", { lineHeight: "1.5" }],
        xl: ["1.5rem", { lineHeight: "1.4" }],
        "2xl": ["2rem", { lineHeight: "1.3" }],
        "3xl": ["2.5rem", { lineHeight: "1.2" }],
      },
      spacing: {
        // Spacing.md section 1 (space-1..space-16 map onto Tailwind's default 4px scale,
        // listed here as named aliases for clarity when reading component code)
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "6": "24px",
        "8": "32px",
        "12": "48px",
        "16": "64px",
      },
      borderRadius: {
        // Spacing.md section 5
        sm: "6px",
        md: "12px",
        lg: "20px",
      },
      maxWidth: {
        // Spacing.md section 3 — reading column
        reading: "680px",
      },
    },
  },
  plugins: [],
};

export default config;
