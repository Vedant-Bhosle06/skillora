import type { Transition, Variants } from "motion/react";

// Shared motion tokens. Durations and curves mirror the CSS variables in index.css
// (--duration-*, --ease-*), so CSS and JS animations feel the same.
//
// CSP note: production builds forbid inline <style> tags, so avoid motion features that inject
// them: AnimatePresence mode="popLayout" and the view() API. Everything else animates through
// element.style / WAAPI, which the policy allows.

export const DURATION = {
  fast: 0.15,
  base: 0.24,
  slow: 0.42,
  cinematic: 0.7,
} as const;

export const EASE = {
  outExpo: [0.16, 1, 0.3, 1],
  outQuint: [0.22, 1, 0.36, 1],
  inOutSmooth: [0.65, 0, 0.35, 1],
} as const;

export const transitions = {
  fast: { duration: DURATION.fast, ease: EASE.outQuint },
  base: { duration: DURATION.base, ease: EASE.outQuint },
  slow: { duration: DURATION.slow, ease: EASE.outExpo },
  cinematic: { duration: DURATION.cinematic, ease: EASE.outExpo },
} satisfies Record<string, Transition>;

/** Fade in while rising a few pixels — the default entrance for content blocks. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: transitions.slow },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
};

/** Dialogs, popovers and menus. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transitions.base },
  exit: { opacity: 0, scale: 0.98, transition: transitions.fast },
};

/** Dropdowns and menus that open from the navbar. */
export const menuReveal: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: transitions.fast },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.1, ease: EASE.inOutSmooth } },
};
