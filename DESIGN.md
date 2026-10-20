---
name: SKILLORA
description: Personalised, prerequisite-respecting learning paths to a tech role, computed by A* over a real skill graph. Design language: Transit, a career drawn as a metro line.
colors:
  paper: "#f6f6f3"
  night: "#0e1013"
  ink-light: "#14161a"
  ink-dark: "#f1f1ee"
  panel-light: "#ffffff"
  panel-dark: "#16191e"
  muted-ink-light: "#575c66"
  muted-ink-dark: "#a3a8b1"
  rule-light: "#d6d7d1"
  rule-dark: "#2b2f36"
  signal-light: "#d42a3c"
  signal-dark: "#ff5263"
  line-alt-light: "#e2621a"
  line-alt-dark: "#ff8a3d"
  line-data-light: "#1f6fb2"
  line-data-dark: "#58a8ff"
  line-web-light: "#1b8f57"
  line-web-dark: "#3ccb87"
  line-cloud-light: "#0f8a8f"
  line-cloud-dark: "#4fd1d4"
  line-design-light: "#c99300"
  line-design-dark: "#ffc93c"
typography:
  sign:
    fontFamily: "Overpass Variable, ui-sans-serif, system-ui, sans-serif"
    weights: "400-900"
  time:
    fontFamily: "Overpass Mono, ui-monospace, monospace"
    note: "Hours, times and codes only. Never decoration."
rounded:
  sm: 4px
  md: 6px
  lg: 10px
  pill: 9999px
---

# Design system: Transit

SKILLORA treats a career as a metro line. Skills are stations, the learning path is the line,
prerequisites are the track between stops, and the plan is read like a departure board. The look is
station signage: flat panels, one signal colour, plain words.

Nocturne Glass (violet gradient, glass panels, Syncopate and Instrument Serif) was retired at the
user's request. Nothing from it remains in the tokens.

## Colour

Paper (light) or night (dark) neutrals, ink for text, and **signal red as the single accent**. Red
means "your route" and "the primary action", nothing else. The other lines are a quiet colour code
for what kind of skill a station is.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#f6f6f3` | `#0e1013` | page |
| `--card` | `#ffffff` | `#16191e` | sign panels |
| `--foreground` | `#14161a` | `#f1f1ee` | text, inverse boards |
| `--muted-foreground` | `#575c66` | `#a3a8b1` | secondary text |
| `--border` | `#d6d7d1` | `#2b2f36` | rules |
| `--primary` | `#d42a3c` | `#ff5263` | route, primary action |
| `--primary-foreground` | `#ffffff` | `#0e1013` | text on red |
| `--ring` | ink | ink | focus ring |
| `--line-route` | `#d42a3c` | `#ff5263` | your route |
| `--line-alt` | `#e2621a` | `#ff8a3d` | alternative routes |
| `--line-data` | `#1f6fb2` | `#58a8ff` | programming, cloud-adjacent |
| `--line-web` | `#1b8f57` | `#3ccb87` | frameworks, maths |
| `--line-cloud` | `#0f8a8f` | `#4fd1d4` | cloud |
| `--line-design` | `#c99300` | `#ffc93c` | tools, design |
| `--line-grey` | `#8c9099` | `#6b717c` | concepts, soft skills, input borders |

Tailwind exposes them as `bg-primary`, `text-muted-foreground`, `border-line-data` and so on
(`--color-line-*` in `@theme inline`). `--station` and `--casing` are the dot fill and the gap
colour under a line. Use the semantic tokens, not hex, in components.

Contrast: body text and `muted-foreground` meet AA on both grounds. Red text is used only at 14px
bold or above. Colour is never the only signal: statuses always carry a word, and pressed chips
fill with ink.

## Typography

Overpass Variable for everything, Overpass Mono for hours, times and ids only. Sentence case; no
uppercase tracking labels. Headings are heavy (700 to 900) with tight leading; body is 15 to 18px.
The numeric weight utilities `font-500` to `font-900` exist in `index.css`.

## Shape

Radii are 4 / 6 / 10 px; buttons and chips are pills. Panels are flat: a 1px border, no shadow.
Selected cards get a 4px signal-red top rule. Inverse signs (terminus, departure-board header) use
`bg-foreground text-background`.

## Components

Primitives in `src/components/ui.tsx` (same exports as before, restyled): `Button` (pill, 44px
minimum; primary is red, secondary is an ink outline, ghost is text, danger is a red outline),
`Card`, `Badge` family, `StatTile` (board cell), `ProgressBar` (a line with stop ticks),
`Modal`, `Input` / `Select` / `Textarea`, `Toast`, `EmptyState`, `ErrorState`
(demand is shown as a word via `demandWord()` in `src/lib/format.ts`).

Transit components in `src/components/transit/`:

- `LineDiagram`: vertical stops (station dot, line segment, label, hours) in `done | current | next | locked` states. The core of Dashboard, Progress and Alternatives.
- `DepartureBoard`: inverse header row over a ruled list ("Next departures").
- `StationChip`: toggle chip with `aria-pressed`, 44px.
- `SignPanel`: flat panel, optional top rule or inverse.
- `ServiceRow` / `ServiceList`: a coloured tag and one plain sentence.
- `Roundel`: the line-colour tag.
- `icons.tsx`: SVG icons (sun, moon, arrow, check, lock, train, menu, close, and more). No unicode glyph icons anywhere.

App shell: a 56px header with the logo, text links, the theme toggle and the account menu; the
active link has a red platform bar. On mobile the links open as a full-width sheet of 48px rows.
A footer ("college team project", link to the evaluation) closes signed-in pages.

## Motion

Short and functional. Page changes slide like a carriage: 10px sideways over 200ms. Reduced motion
(`MotionConfig reducedMotion="user"` plus the CSS media query) gives a plain fade. The strict CSP
applies: no scroll `view()` timelines, no `AnimatePresence mode="popLayout"`; use `useRange` from
`src/lib/scrollRange.ts` rather than array `useTransform`. Nothing depends on hover.

## Do

- Speak in plain words: "High demand", "Up next", "Good service".
- Use the line for structure: path as a line, skills as stops, hours in mono.
- Keep every target at 44px or more, with a visible ink focus ring.
- Test both themes; every value has a light and a dark version.

## Don't

- No violet or purple, no gradients as identity, no gradient text.
- No decorative glass or backdrop blur.
- No eyebrow or kicker labels in tiny uppercase.
- No progress rings, no hero-metric template (big number, small label, gradient).
- No unicode glyph icons (sun, moon, arrows, ticks); use the SVG set.
- No second accent colour competing with signal red.
