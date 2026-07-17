# Spacing.md — Spacing, Layout & Grid System

## 1. Base Unit

`4px` base unit — every spacing token is a multiple of 4, standard for both Tailwind (web) and React Native styling consistency.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon-to-text gaps |
| `space-2` | 8px | Tight internal padding (chips, Tokens) |
| `space-3` | 12px | Comment indent step (nested threads) |
| `space-4` | 16px | Default card padding |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Page-level vertical rhythm |
| `space-12` | 48px | Major section breaks (e.g., onboarding steps) |
| `space-16` | 64px | Hero/empty-state breathing room |

## 2. Nested Comment Indentation

- Each nesting level indents by `space-3` (12px) on mobile, `space-4` (16px) on web — kept tight so deep threads don't push content off-screen, with a subtle `border-subtle` connecting line rather than large gaps to show hierarchy.
- Auto-collapse threads past 3 levels deep with a "continue thread" tap/click — same pattern as Reddit, necessary at this nesting depth.

## 3. Layout Grid — Web (Next.js)

- Max content width: `680px` for post/comment reading column (optimized for long-form reading, matches the "journal" cozy feel) — sidebars (Circle info, navigation) sit outside this column on wider viewports.
- Breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px` (standard Tailwind scale, no custom breakpoints needed).
- Single-column, feed-first layout below `md` — sidebar collapses into a drawer.

## 4. Layout Grid — Mobile (React Native)

- Full-width single-column feed, `space-4` (16px) horizontal screen padding.
- Bottom tab navigation: Home, Explore Circles, Create Post (center, elevated), DMs, Profile.
- Comment nesting caps at 2 visible levels on mobile before "continue thread" (tighter than web, screen-width constraint).

## 5. Radius & Elevation

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Chips, Tokens |
| `radius-md` | 12px | Cards, post containers |
| `radius-lg` | 20px | Modals, bottom sheets |
| `elevation-1` | subtle shadow, 2px blur | Cards on light theme only (dark theme uses `bg-elevated` instead of shadow) |
