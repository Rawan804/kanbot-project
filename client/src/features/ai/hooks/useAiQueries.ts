import { useQuery } from '@tanstack/react-query';
import { getAiStatus } from '../../../api/ai';
export const aiKeys = {
  status: ['ai-status'] as const,
};
export function useAiStatus() {
  return useQuery({
    queryKey: aiKeys.status,
    queryFn: getAiStatus,
    staleTime: Infinity,
    retry: false,
  });
}
