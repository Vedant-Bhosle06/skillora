---
name: SKILLORA
description: Personalised, prerequisite-respecting learning paths to a tech role, computed by A* over a real skill graph.
colors:
  ground-light: "#F5F6FC"
  ground-dark: "#070A16"
  ink-light: "#0B0E1F"
  ink-dark: "#EEF0FF"
  surface-light: "#FFFFFF"
  surface-dark: "#0E1222"
  muted-ink-light: "#596079"
  muted-ink-dark: "#959CC0"
  border-light: "#DDE1F0"
  border-dark: "#232A52"
  iris-light: "#5B45F0"
  iris-dark: "#715DF8"
  signal-blue-light: "#0377C4"
  signal-blue-dark: "#38BDF8"
  secondary-light: "#EEEBFF"
  secondary-dark: "#181D3D"
typography:
  display-wide:
    fontFamily: "Syncopate, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 9vw, 8.5rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.18em"
  statement:
    fontFamily: "Instrument Serif, ui-serif, Georgia, serif"
    fontSize: "clamp(2.4rem, 7.2vw, 6.5rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  app-body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  app-heading:
    fontFamily: "DM Sans, sans-serif"
    fontWeight: 700
  label:
    fontFamily: "Syncopate, ui-sans-serif, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.18em"
rounded:
  control: "10px"
  card: "18px"
  bezel-outer: "2rem"
  bezel-inner: "calc(2rem - 0.375rem)"
  pill: "9999px"
spacing:
  bezel-gap: "0.375rem"
  section-y: "96px–144px"
  gutter: "20px–40px"
components:
  button-primary:
    backgroundColor: "{colors.iris-light}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  pill-link-primary:
    backgroundColor: "{colors.ink-light}"
    textColor: "{colors.ground-light}"
    rounded: "{rounded.pill}"
    padding: "6px 6px 6px 24px"
---

# Design System: SKILLORA

> Recorded by `$impeccable document` (scan mode) on 2026-10-20 as the **incumbent** system, before the next round of landing prototypes. Sources: `skillora-client/src/index.css`, `src/components/ui.tsx`, `src/components/Logo.tsx`, `src/components/landing/*`, `src/lib/motion.ts`. The `.impeccable/design.json` sidecar was not generated (live mode is not set up).

## Overview

**Creative North Star: "Nocturne Glass"**

A night-time instrument panel: a navy-black ground lit by soft purple and blue light pools, with content held on double-bezel glass plates and a live three.js rendering of the real skill graph as the hero. The homepage tells one story with scroll — one known skill, its neighbourhood, the whole map, the cheapest route — and ends with the route becoming the S-path mark. Signed-in app screens use the same tokens in a plainer, denser form (Inter/DM Sans, 10px radii, flat cards).

The system is fully dual-theme: every token has a light and a dark value, and the theme toggle restyles the WebGL scene too.

**Key Characteristics:**
- Real data as imagery (graph snapshot, engine routes, D6 metrics), no stock or generated pictures.
- Glass plates (backdrop blur) on a lit ground; tray-and-plate "double bezel" cards.
- Three faces: wide caps (Syncopate), serif statements with one italic phrase (Instrument Serif), Plus Jakarta Sans for UI on the homepage.
- Scroll-scrubbed storytelling; word-by-word reveals; spring-like expo easing.

**Confirmed rejection (user, 2026-10-20):** the violet-to-blue gradient (gradient text, gradient bars, the violet ambient pools) reads as generic "AI-made". Future work must not carry it forward.

## Colors

A cool two-hue palette — iris violet and signal blue — on near-white or navy-black, used mostly as light and as gradients.

### Primary
- **Iris** (#5B45F0 light / #715DF8 dark): primary buttons, active states, progress, route highlights; the start of every gradient.

### Secondary
- **Signal Blue** (#0377C4 light / #38BDF8 dark): the user's held skills, accents, the end of every gradient.

### Neutral
- **Ground** (#F5F6FC / #070A16): page background.
- **Ink** (#0B0E1F / #EEF0FF): text and headings.
- **Muted Ink** (#596079 / #959CC0): secondary text (≥5.4:1 on ground).
- **Surface** (#FFFFFF / #0E1222) and **Border** (#DDE1F0 / #232A52): app cards and dividers.

### Named Rules
**The Gradient Habit (incumbent, now rejected).** Iris→Signal Blue gradients appear on headline text (`.text-gradient-brand`), bars, the progress rail, the WebGL route trail and the logo tile. This is the device the user called AI slop.

## Typography

**Display Font:** Syncopate (wide caps, homepage title and labels)
**Statement Font:** Instrument Serif, with one italic phrase per statement
**Body Font:** Plus Jakarta Sans (homepage); Inter body + DM Sans headings (app)

**Character:** a film-title wordmark over editorial serif lines; the app side is plain and functional. Numeric `font-500…font-800` utilities map to real weights.

### Hierarchy
- **Display** (Syncopate 700, clamp(2.4rem, 9vw, 8.5rem), 1.0, 0.18em): the hero's SKILLORA title card.
- **Statement** (Instrument Serif 400, clamp(2.4rem, 7.2vw, 6.5rem), 0.98): hero chapters and section headings.
- **Body** (Plus Jakarta 400, 15–17px, 1.6, max ~28rem): supporting sentences.
- **Label** (Syncopate 700, 10px, 0.18em, uppercase): section labels above headings.

## Layout

Homepage: `max-w-6xl` sections, 20–40px gutters, 96–144px between sections; asymmetric 12-column bento (7/5, 4/4/4) collapsing to one column under 768px; a 520vh sticky hero. App: `max-w-6xl` pages with a 56px sticky navbar.

## Elevation & Depth

Hybrid. Homepage depth comes from glass (18px backdrop blur, inset 1px highlight) over fixed ambient light pools and a long soft drop (`0 30px 80px -40px`). App cards use `shadow-sm` at rest and a coloured glow on hover (`--glow-shadow`).

## Shapes

Rounded throughout: 2rem outer bezels with concentric inner radii, full pills for navigation and homepage buttons, 10px radius for app controls. The S-path mark (four nodes on a smooth S) is the one recurring silhouette.

## Components

### Buttons
- **App primary:** Iris fill, white text, 10px radius; lifts 1px and glows on hover, scales to 0.97 on press.
- **Homepage pill link:** ink-on-ground inverted pill with its arrow nested in a circle; ghost variant with a 15% ink ring.

### Cards / Containers
- **Double bezel:** tray (`--glass-shell`, 1px ring, 6px padding, 2rem radius) holding a glass plate (vertical white-alpha gradient, blur 18px).

### Navigation
- **Homepage:** a floating glass pill with mark + wordmark, three anchor links, theme toggle and Sign in / Dashboard.
- **App:** 56px sticky bar, tile logo, text links with a tinted active state, avatar menu.

### Signature: the WebGL graph hero
114 real skills as glowing points, 205 links as lines, the A* route as a dense point trail that morphs into the S-mark; labels are DOM chips; still SVG fallback for reduced motion / no WebGL.

## Do's and Don'ts

### Do:
- **Do** keep every value dual-theme; check both themes on every change.
- **Do** source numbers and visuals from the dataset, engine and evaluation only (see PRODUCT.md, Evidence on Hand).
- **Do** keep the S-path mark's form; recolouring is allowed.
- **Do** give every animation a reduced-motion still.

### Don't:
- **Don't** use the violet→blue gradient (text, bars, glows, pools) — rejected by the user as AI-generic.
- **Don't** hide key information behind hover-only interactions (the "Within reach" map currently shows skill names only under the cursor).
- **Don't** invent testimonials, users, logos or pricing.
