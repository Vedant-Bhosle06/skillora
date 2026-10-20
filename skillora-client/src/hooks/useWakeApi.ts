import { useEffect } from 'react';
import { getPublicStats } from '@/api/skills';

// Free hosting puts the API to sleep when idle. A fire-and-forget request on the
// public pages starts waking it before the visitor signs in. No UI, errors ignored.
export function useWakeApi(): void {
  useEffect(() => {
    getPublicStats().catch(() => {});
  }, []);
}
