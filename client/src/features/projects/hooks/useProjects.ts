import { useQuery } from '@tanstack/react-query';
import { getProject, listProjects } from '../../../api/projects';
export const projectsKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['project', id] as const,
};
export function useProjects() {
  return useQuery({ queryKey: projectsKeys.all, queryFn: listProjects });
}
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId as string),
    enabled: Boolean(projectId),
  });
}
