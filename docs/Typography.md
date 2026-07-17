# Typography.md — Type System

Modern sans-serif direction (per your answer), tuned to still feel warm rather than corporate/cold.

## 1. Typeface Choices (free, open-source — no licensing cost)

- **Primary (UI + body):** Inter — highly legible, modern, free via Google Fonts.
- **Display/Headings (optional accent):** Fraunces or Lora (a warm serif) used *sparingly* for big emotional moments — e.g., onboarding welcome screen, empty states — to inject the "cozy" feeling without sacrificing the "modern" body text. **Flagging this hybrid approach for your confirmation** — if you'd rather stay 100% sans-serif everywhere, easy to drop.

## 2. Type Scale (rem-based, 16px root)

| Token | Size | Line-height | Usage |
|---|---|---|---|
| `text-xs` | 0.75rem (12px) | 1.4 | Timestamps, metadata |
| `text-sm` | 0.875rem (14px) | 1.5 | Secondary text, comment body |
| `text-base` | 1rem (16px) | 1.6 | Body text, post content |
| `text-lg` | 1.125rem (18px) | 1.5 | Post titles (in-feed) |
| `text-xl` | 1.5rem (24px) | 1.4 | Post detail title |
| `text-2xl` | 2rem (32px) | 1.3 | Section headers |
| `text-3xl` | 2.5rem (40px) | 1.2 | Onboarding/marketing headlines (Fraunces, if approved) |

## 3. Weight Usage

- 400 (regular) — body text, comments
- 500 (medium) — usernames, Circle names, buttons
- 600 (semibold) — post titles, section headers
- 700 (bold) — used sparingly, key emphasis only (Resonance number, Token unlock moment)

## 4. Tone of Voice in Copy

- Direct, warm, never corporate-cheerful. "Something went wrong. Try again." not "Oopsie! Let's try that again! 😊"
- No forced exclamation marks in system copy.
- Report/moderation copy: blunt and clear, per your direction — "This will be reviewed by Circle moderators. Repeated false reports may restrict your account."
