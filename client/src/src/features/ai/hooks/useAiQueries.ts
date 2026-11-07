import { useQuery } from '@tanstack/react-query';
import { getAiStatus } from '../../../api/ai';

/**
 * Query key for the AI status endpoint.
 * Exported so mutations can invalidate it if needed.
 */
export const aiKeys = {
  status: ['ai-status'] as const,
};

/**
 * AI-5: Fetch the AI mode once per session.
 *
 * `staleTime: Infinity` means the result is never considered stale and will
 * not be refetched automatically. It is requested once when any component
 * mounts that uses this hook, then served from cache for the rest of the
 * session. A status failure must not break any other UI.
 *
 * `retry: false` — a failed status check stays failed silently; it does not
 * block the assistant drawer or any other feature.
 */
export function useAiStatus() {
  return useQuery({
    queryKey: aiKeys.status,
    queryFn: getAiStatus,
    staleTime: Infinity,
    retry: false,
  });
}
