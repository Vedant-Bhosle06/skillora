// Reduced-motion preference outside React/motion (e.g. the three.js hero render loop).
// Components using motion get the same behaviour from <MotionConfig reducedMotion="user">.

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type MatchMedia = (query: string) => MediaQueryList;

function defaultMatchMedia(): MatchMedia | undefined {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia.bind(window)
    : undefined;
}

/** True when the user asked the OS/browser to reduce motion. False if it can't be determined. */
export function prefersReducedMotion(matchMedia: MatchMedia | undefined = defaultMatchMedia()): boolean {
  try {
    return matchMedia ? matchMedia(REDUCED_MOTION_QUERY).matches : false;
  } catch {
    return false;
  }
}

/** Calls `onChange` whenever the preference changes. Returns an unsubscribe function. */
export function subscribeReducedMotion(
  onChange: (reduced: boolean) => void,
  matchMedia: MatchMedia | undefined = defaultMatchMedia(),
): () => void {
  if (!matchMedia) return () => {};
  try {
    const mql = matchMedia(REDUCED_MOTION_QUERY);
    const listener = (e: MediaQueryListEvent) => onChange(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  } catch {
    return () => {};
  }
}
