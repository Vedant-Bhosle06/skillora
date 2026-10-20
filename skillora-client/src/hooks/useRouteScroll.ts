import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Scroll handling for animated route changes. The browser's own restoration fires while the
// previous page is still fading out, so it lands at the wrong offset. Instead:
// - remember each history entry's scroll offset as we leave it;
// - when the next page mounts, go to the top for new navigations (PUSH / REPLACE), or back to
//   the remembered offset for back/forward (POP).
export function useRouteScroll() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const currentKey = useRef(location.key);

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  // Runs before paint on every location change: the old page is still on screen, so scrollY
  // is still the offset of the entry we are leaving.
  useLayoutEffect(() => {
    if (currentKey.current !== location.key) {
      positions.current.set(currentKey.current, window.scrollY);
      currentKey.current = location.key;
    }
  }, [location.key]);

  /** Call when the new page has mounted. */
  return useCallback(() => {
    const y = navigationType === "POP" ? positions.current.get(location.key) ?? 0 : 0;
    window.scrollTo(0, y);
  }, [navigationType, location.key]);
}
