import { describe, expect, it, vi } from "vitest";
import { REDUCED_MOTION_QUERY, prefersReducedMotion, subscribeReducedMotion } from "./reducedMotion";

function fakeMatchMedia(matches: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    matches,
    addEventListener: (_: string, l: (e: { matches: boolean }) => void) => listeners.add(l),
    removeEventListener: (_: string, l: (e: { matches: boolean }) => void) => listeners.delete(l),
  };
  const fn = vi.fn((_query: string) => mql as unknown as MediaQueryList);
  const emit = (value: boolean) => listeners.forEach(l => l({ matches: value }));
  return { fn, emit, listeners };
}

describe("prefersReducedMotion", () => {
  it("reads the reduced-motion media query", () => {
    const mm = fakeMatchMedia(true);
    expect(prefersReducedMotion(mm.fn)).toBe(true);
    expect(mm.fn).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
    expect(prefersReducedMotion(fakeMatchMedia(false).fn)).toBe(false);
  });

  it("defaults to false when matchMedia is unavailable or throws", () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
    expect(prefersReducedMotion(() => { throw new Error("no"); })).toBe(false);
  });
});

describe("subscribeReducedMotion", () => {
  it("notifies on change and unsubscribes cleanly", () => {
    const mm = fakeMatchMedia(false);
    const seen: boolean[] = [];
    const unsubscribe = subscribeReducedMotion(v => seen.push(v), mm.fn);
    mm.emit(true);
    mm.emit(false);
    expect(seen).toEqual([true, false]);
    unsubscribe();
    expect(mm.listeners.size).toBe(0);
  });

  it("is a no-op without matchMedia", () => {
    expect(() => subscribeReducedMotion(() => {}, undefined)()).not.toThrow();
  });
});
