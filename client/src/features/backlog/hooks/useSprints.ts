import { useQuery } from '@tanstack/react-query';
import { listSprints } from '../../../api/sprints';

export const sprintsKeys = {
  all: (projectId: string) => ['sprints', projectId] as const,
};

/**
 * List sprints for a project — used by the todo details dialog to populate the
 * "Sprint" select field (backlog + planned/active sprints).
 */
export function useSprints(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? sprintsKeys.all(projectId) : ['sprints-disabled'],
    queryFn: () => listSprints(projectId as string),
    enabled: Boolean(projectId),
  });
}
