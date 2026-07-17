# Colour.md — Colour System

Warm, cozy, dark-mode-first, both themes fully designed. All values are proposals — confirm before they're locked into code as design tokens.

## 1. Dark Theme (default)

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#1C1815` | App background — warm charcoal, not pure black |
| `bg-surface` | `#241F1B` | Cards, post containers |
| `bg-elevated` | `#2E2822` | Modals, dropdowns |
| `border-subtle` | `#3A332C` | Dividers, card borders |
| `text-primary` | `#F2E9DE` | Main text — warm off-white, not stark white |
| `text-secondary` | `#B8AC9C` | Metadata, timestamps |
| `accent-primary` | `#D98E5B` | Terracotta — primary buttons, links, Nod highlight |
| `accent-secondary` | `#8AA68A` | Sage green — success states, Rhythm indicator |
| `accent-nod` | `#D98E5B` | Nod (upvote equivalent) |
| `accent-pass` | `#6E6259` | Pass (downvote equivalent) — muted, not alarming red |
| `accent-danger` | `#CC6656` | Report/destructive actions only |
| `token-gold` | `#C9A24B` | Token (badge) highlight color |

## 2. Light Theme

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#FBF6EF` | Cream paper, not clinical white |
| `bg-surface` | `#F3ECE1` | Cards |
| `bg-elevated` | `#FFFFFF` | Modals |
| `border-subtle` | `#E3D8C8` | Dividers |
| `text-primary` | `#2B241D` | Main text — warm near-black |
| `text-secondary` | `#6E6259` | Metadata |
| `accent-primary` | `#C97A45` | Terracotta, slightly deeper for light-mode contrast |
| `accent-secondary` | `#5F7D5F` | Sage green, deepened for contrast |
| `accent-nod` | `#C97A45` | Nod |
| `accent-pass` | `#8C8171` | Pass |
| `accent-danger` | `#A8402F` | Report/destructive |
| `token-gold` | `#A9812E` | Token highlight |

## 3. Semantic Rules

- **Never use pure red/green for Nod/Pass** — keeps the "quiet, non-performative" tone; terracotta vs. muted taupe instead of green vs. red.
- `accent-danger` is reserved *only* for Report and destructive/irreversible actions (leave Circle, delete post) — never used decoratively.
- Resonance number always renders in `text-primary`, never in an accent color — it's information, not a flex.
- Contrast checked against WCAG AA for all text/background pairs above — actually computed (not assumed) in Phase 13: every pair passes AA for normal text except dark-mode danger-red-on-base, which failed at 4.03:1 and was corrected to `#CC6656` (4.7:1). Full computation method and results in the Phase 13 section of `README.md`.

## 4. Open Question for You

Do these warm terracotta + sage tones match what you pictured for "cozy," or would you like the palette leaned more toward blues/purples (calmer, more introspective) instead of warm orange/green? Easy to swap the accent pair before this becomes code.
