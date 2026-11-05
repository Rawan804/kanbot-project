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

// ─── AI-1: Chat ──────────────────────────────────────────────────────────────

/**
 * Stateless chat mutation. The full conversation history is passed as part of
 * the request body on every call; the backend does not store history.
 */
export function useChat(projectId: string) {
  return useMutation({
    mutationFn: (body: ChatRequest) => sendChat(projectId, body),
    // No cache invalidation needed — chat does not change any data entities.
    retry: false,
  });
}

// ─── AI-2: Generate todos ────────────────────────────────────────────────────

/** Generate draft todos from a prompt. Does not save anything. */
export function useGenerateTodos(projectId: string) {
  return useMutation({
    mutationFn: (body: GenerateTodosRequest) => generateTodos(projectId, body),
    retry: false,
  });
}

/**
 * Bulk-save selected drafts to the backlog.
 * Called only after explicit user confirmation in the draft review UI.
 */
export function useSaveDraftTodos(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkCreateTodosRequest) => bulkCreateTodos(projectId, body),
    onSuccess: () => {
      // The new todos appear in the backlog.
      void qc.invalidateQueries({ queryKey: todosKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
    },
    retry: false,
  });
}

// ─── AI-3: Plan sprint ───────────────────────────────────────────────────────

/** Generate a sprint plan suggestion. Does not create a sprint. */
export function usePlanSprint(projectId: string) {
  return useMutation({
    mutationFn: (body: PlanSprintRequest) => planSprint(projectId, body),
    retry: false,
  });
}

/**
 * Create a planned sprint from the AI suggestion.
 * Called only after explicit user confirmation; invalidates the sprint list.
 */
export function useCreateSprintFromPlan(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSprintRequest) => createSprint(projectId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: todosKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
    },
    retry: false,
  });
}
