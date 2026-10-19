import React, { ReactNode } from "react";
import { m, type Variants } from "motion/react";
import { fadeUp, stagger } from "@/lib/motion";

// Scroll-triggered entrances. Content animates once, when it first scrolls into view.
// With reduced motion, MotionConfig drops the movement and keeps a short fade.

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Entrance animation (hidden → visible). Defaults to a fade-up. */
  variants?: Variants;
  /** Seconds to wait after the element enters the viewport. */
  delay?: number;
  /** Share of the element that must be visible before it animates (0–1). */
  amount?: number;
  as?: "div" | "section" | "li" | "ul" | "article";
};

/** Reveals a single block as it scrolls into view. */
export function Reveal({ children, className, variants = fadeUp, delay = 0, amount = 0.2, as = "div" }: RevealProps) {
  const Component = m[as];
  return (
    <Component
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </Component>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  /** Seconds between each child's entrance. */
  gap?: number;
  delay?: number;
  amount?: number;
  as?: "div" | "section" | "ul" | "ol";
};

/** Reveals its <StaggerItem> children one after another as the group scrolls into view. */
export function Stagger({ children, className, gap = 0.06, delay = 0, amount = 0.15, as = "div" }: StaggerProps) {
  const Component = m[as];
  return (
    <Component
      className={className}
      variants={stagger(gap, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </Component>
  );
}

/** A child of <Stagger>; inherits the parent's hidden/visible state. */
export function StaggerItem({ children, className, variants = fadeUp, as = "div" }: Omit<RevealProps, "delay" | "amount">) {
  const Component = m[as];
  return (
    <Component className={className} variants={variants}>
      {children}
    </Component>
  );
}
