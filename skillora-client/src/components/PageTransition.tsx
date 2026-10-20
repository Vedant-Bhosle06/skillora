import React, { ReactNode, useLayoutEffect } from "react";
import { m, type Variants } from "motion/react";
import { EASE } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// Wraps one routed page so <AnimatePresence> in App.tsx can slide it in and out like a carriage
// pulling into a platform: 10px sideways, 200ms. With reduced motion, MotionConfig drops the
// movement and only the opacity fade runs. Motion clears the transform once the entrance
// finishes, so fixed-position content inside a page (e.g. Modal) is positioned against the
// viewport as usual.
const carriage: Variants = {
  hidden: { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: EASE.outQuint } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.12, ease: EASE.inOutSmooth } },
};

// Reduced motion: no sideways movement at all, only a quick fade.
const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export default function PageTransition({ children, onMount }: { children: ReactNode; onMount?: () => void }) {
  // Once, before the first paint of this page (App uses it to set the scroll position).
  useLayoutEffect(() => { onMount?.(); }, []);

  const reduced = usePrefersReducedMotion();

  return (
    <m.div variants={reduced ? fade : carriage} initial="hidden" animate="visible" exit="exit">
      {children}
    </m.div>
  );
}
