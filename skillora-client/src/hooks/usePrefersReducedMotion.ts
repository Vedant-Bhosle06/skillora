import { useEffect, useState } from "react";
import { prefersReducedMotion, subscribeReducedMotion } from "@/lib/reducedMotion";

/** The OS/browser reduced-motion preference, kept up to date. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => prefersReducedMotion());
  useEffect(() => subscribeReducedMotion(setReduced), []);
  return reduced;
}
