import React, { ReactNode } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { transitions } from "@/lib/motion";

// App-wide motion setup:
// - LazyMotion + domAnimation keeps the bundle small; `strict` makes any accidental use of the
//   full `motion.*` components throw, so components must use the light `m.*` ones.
// - reducedMotion="user" turns transform/layout animations off when the OS asks for reduced
//   motion (opacity fades still run, which is the recommended behaviour).
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={transitions.base}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
