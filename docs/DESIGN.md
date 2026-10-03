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

## Motion (src/components/motion)
Motion explains or guides; it never decorates for its own sake. One primitive per job:
- `Reveal` (fade + 18px rise on scroll-in), `SplitWords` (hero headline only), `CountUp` (stats),
  `Marquee` (paper list), `Magnetic` (primary hero CTA only), `ScrollProgress`, `DrawPath` (scroll-drawn line),
  `Constellation` (canvas particles: hero and final CTA only), `LoadingScene` / `Skeleton` (every loading state).
- **Content must be visible without JavaScript.** Anything that starts hidden carries `data-motion`; a `<noscript>`
  rule in `app/layout.tsx` forces it visible. Animate `transform`/`opacity` only — never `width` — so that rule works.
- `CountUp` server-renders the real number; it only resets to 0 when it starts off-screen.
- In-view margins are vertical only (`"-60px 0px"`); a horizontal inset hides narrow items at the screen edge.
- Respect `prefers-reduced-motion`, never hijack scrolling, pause canvases off-screen.
- No stock or third-party illustrations. Visuals are code-drawn scenes (`motion/scenes.tsx`: answer sheet,
  score journey, recall curves, plan calendar, dot mark); people are shown with real photos only.

## Writing
- Plain, specific sentences. Say what the thing does, with real numbers.
- No hype ("unlock", "ruthless", "journey", "seamless", "supercharge", "game-changer").
- No slogans built from negations ("No X. No Y. No Z.") and no dramatic metaphors ("marks leaking").
- Address the student as "you". Short paragraphs. British/Indian spelling ("practise" verb, "practice" noun).
- Every claim must be true today: if a feature or number isn't live, don't write it.

## Accessibility (checked with axe-core, WCAG 2.1 AA: 0 violations on public pages, Oct 2026)
- **Text contrast ≥ 4.5:1.** On white or zinc-50 use `text-zinc-500` or darker for any text; `text-zinc-400` only on
  dark (`bg-ink`) sections or for decorative icons. On `bg-zinc-100` use `text-zinc-600`. Dimmed states: opacity ≥ 0.8.
- **Touch targets:** standalone controls ≥ 44 px tall (`min-h-11`); FAQ rows put the padding on `<summary>`, not on
  `<details>`. Links inside sentences are exempt.
- **Scrolling areas** (wide tables, long formulas, the instructions panel) get `tabIndex={0} role="region" aria-label`,
  so keyboard users can scroll them.
- **Animated headlines** (`SplitWords`): the real text is in an `sr-only` span; the animated words are `aria-hidden`.
- Keep a visible focus style on everything clickable (never `outline-none` without a replacement).
- Re-run: `node <scratch>/a11y.mjs axe.min.js /path …` against `next start` (desktop + 390 px).
