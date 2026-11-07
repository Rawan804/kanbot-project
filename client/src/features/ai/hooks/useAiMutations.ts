import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateTodos, planSprint, sendChat } from '../../../api/ai';
import { bulkCreateTodos } from '../../../api/todos';
import { createSprint } from '../../../api/sprints';
import type {
  BulkCreateTodosRequest,
  ChatRequest,
  CreateSprintRequest,
  GenerateTodosRequest,
  PlanSprintRequest,
} from '../../../types/api';
import { todosKeys } from '../../backlog/hooks/useTodos';
import { sprintsKeys } from '../../backlog/hooks/useSprints';
import { projectsKeys } from '../../projects/hooks/useProjects';

export function useChat(projectId: string) {
  return useMutation({
    mutationFn: (body: ChatRequest) => sendChat(projectId, body),
    meta: { successMessage: 'AI response received.' },
   
    retry: false,
  });
}
export function useGenerateTodos(projectId: string) {
  return useMutation({
    mutationFn: (body: GenerateTodosRequest) => generateTodos(projectId, body),
    meta: { successMessage: 'Todo suggestions generated.' },
    retry: false,
  });
}
export function useSaveDraftTodos(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkCreateTodosRequest) => bulkCreateTodos(projectId, body),
    meta: { successMessage: 'Todos added to the backlog.' },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: todosKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.all });
    },
    retry: false,
  });
}
export function usePlanSprint(projectId: string) {
  return useMutation({
    mutationFn: (body: PlanSprintRequest) => planSprint(projectId, body),
    meta: { successMessage: 'Sprint plan generated.' },
    retry: false,
  });
}
export function useCreateSprintFromPlan(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSprintRequest) => createSprint(projectId, body),
    meta: { successMessage: 'Sprint created from plan.' },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: todosKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.all });
    },
    retry: false,
  });
}
