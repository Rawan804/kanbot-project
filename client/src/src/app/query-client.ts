import { QueryClient } from '@tanstack/react-query';
import { isRetryableError } from '../lib/api-error';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => isRetryableError(error) && failureCount < 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
      refetchOnWindowFocus: false,
      throwOnError: false,
    },
    mutations: {
      retry: false,
    },
  },
});
