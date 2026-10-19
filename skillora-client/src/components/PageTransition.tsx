import React, { ReactNode, useLayoutEffect } from "react";
import { m } from "motion/react";
import { pageTransition } from "@/lib/motion";

// Wraps one routed page so <AnimatePresence> in App.tsx can fade it in and out.
// Motion clears the transform once the entrance finishes, so fixed-position content inside a
// page (e.g. Modal) is positioned against the viewport as usual.
export default function PageTransition({ children, onMount }: { children: ReactNode; onMount?: () => void }) {
  // Once, before the first paint of this page (App uses it to set the scroll position).
  useLayoutEffect(() => { onMount?.(); }, []);

  return (
    <m.div variants={pageTransition} initial="hidden" animate="visible" exit="exit">
      {children}
    </m.div>
  );
}
