import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject, deleteProject, updateProject } from '../../../api/projects';
import type { CreateProjectRequest, UpdateProjectRequest } from '../../../types/api';
import { projectsKeys } from './useProjects';

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectRequest) => createProject(body),
    meta: { successMessage: 'Project created.' },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectsKeys.all }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { projectId: string; body: UpdateProjectRequest }) =>
      updateProject(args.projectId, args.body),
    meta: { successMessage: 'Project updated.' },
      onSuccess: (project) => {
      qc.setQueryData(projectsKeys.detail(project.id), project);
      qc.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    meta: { successMessage: 'Project deleted.' },
    onSuccess: (_data, projectId) => {
      qc.removeQueries({ queryKey: projectsKeys.detail(projectId) });
      qc.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}
