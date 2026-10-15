import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';

// Retry only network failures and 5xx, at most twice. 4xx answers are final.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        error instanceof ApiError && (error.status === 0 || error.status >= 500) && failureCount < 2,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: { retry: false },
  },
});
