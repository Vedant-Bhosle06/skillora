import { useTransform, type MotionValue } from "motion/react";

/** Piecewise-linear interpolation, clamped at both ends. */
export function piecewise(v: number, input: number[], output: number[]): number {
  if (v <= input[0]) return output[0];
  for (let i = 1; i < input.length; i++) {
    if (v <= input[i]) {
      const t = (v - input[i - 1]) / (input[i] - input[i - 1] || 1);
      return output[i - 1] + (output[i] - output[i - 1]) * t;
    }
  }
  return output[output.length - 1];
}

/** Maps a scroll MotionValue in JS. (Mapping arrays straight from useScroll lets motion hand them
 *  to the browser's ViewTimeline, whose ranges don't match a sticky section: values drift and
 *  snap back outside the range.) */
export function useRange(progress: MotionValue<number>, input: number[], output: number[]) {
  return useTransform(progress, (v: number) => piecewise(v, input, output));
}
