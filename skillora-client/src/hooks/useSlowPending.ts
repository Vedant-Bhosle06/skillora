import { useEffect, useState } from 'react';

/** True once `pending` has stayed true for `delayMs`; resets when it ends. */
export function useSlowPending(pending: boolean, delayMs = 4000): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const id = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(id);
  }, [pending, delayMs]);
  return slow;
}
