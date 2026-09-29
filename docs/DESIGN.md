# Lemyte design system

Minimal, calm and readable. The product is an exam tool: clarity beats decoration.
Primitives live in `src/components/site/ui.tsx` (type scale, buttons, cards) and `src/components/site/SiteChrome.tsx`
(header, footer). Tokens are in `src/app/globals.css` (`@theme`).

## Type
- **Font:** Inter (`--font-inter`), set in `src/app/layout.tsx`. Numbers use `tabular-nums` wherever they line up
  (scores, timers, tables).
- **Weights:** 400 body, 500 UI/labels/buttons, 600 headings. No 700+ ("font-black" is retired).
- **Scale:** 12 · 14 · 15 (body copy) · 16 · 18 (lead) · 20 · 24 · 30 · 36 · 48 · 56 (display).
  Use `type.display / h2 / h3 / lead / body / small` from `ui.tsx` instead of hand-written classes.
- Headings: tracking −0.02em to −0.03em, line-height 1.1–1.25, `text-wrap: balance` (global).
- Body: line-height ~1.6, max ~65 characters per line (`max-w-xl`/`max-w-2xl`).

## Colour
| Token | Value | Use |
|---|---|---|
| `brand` | `#193bc8` | primary buttons, links, key highlights |
| `brand-700` | `#1330a8` | hover/pressed |
| `brand-50` / `brand-100` | `#eef2fd` / `#dde5fb` | icon tiles, soft callouts, selection |
| `ink` | `#0b0b0d` | headings, primary text, dark sections |
| zinc-600 / 500 | — | body / secondary text |
| zinc-200 | — | borders, dividers |
| white / zinc-50 | — | surfaces |
Status colours only where they mean something: emerald (correct / strong), amber (developing), rose (wrong / weak).

## Components
- **Buttons:** 44px (`md`), 48px (`lg`), 36px (`sm`); radius 10px; medium weight. `primary` (brand), `secondary`
  (white + border), `dark`, `ghost` (text link). Always a visible focus ring.
- **Cards:** radius 16px (`rounded-2xl`), 1px zinc-200 border, no heavy shadows. Padding 24px.
- **Icons:** lucide, 20px, stroke 1.75, brand colour inside a `brand-50` tile when decorative.
- **Layout:** `Container` max-width 1152px, 20–24px side padding. Section spacing 80–96px.

## Writing
- Plain, specific sentences. Say what the thing does, with real numbers.
- No hype ("unlock", "ruthless", "journey", "seamless", "supercharge", "game-changer").
- No slogans built from negations ("No X. No Y. No Z.") and no dramatic metaphors ("marks leaking").
- Address the student as "you". Short paragraphs. British/Indian spelling ("practise" verb, "practice" noun).
- Every claim must be true today: if a feature or number isn't live, don't write it.
