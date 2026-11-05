import { useQuery } from '@tanstack/react-query';
import { listTodos } from '../../../api/todos';
import type { TodoListQuery } from '../../../types/api';

/**
 * Centralised query-key factory for todos.
 *
 * ['todos', projectId]          → all todos for a project (used to broadly invalidate)
 * ['todos', projectId, params]  → the exact list with search/filter params applied
 *
 * Keeping the project id at position [1] lets mutations do a broad invalidation
 * with just the project id (no need to know the current filter state).
 */
export const todosKeys = {
  all: (projectId: string) => ['todos', projectId] as const,
  list: (projectId: string, params: TodoListQuery) =>
    ['todos', projectId, params] as const,
};

/**
 * BL-1: fetch the backlog for a given project.
 * `params` are serialised into the query key so each unique filter set gets its
 * own cache entry. The query is disabled when projectId is absent (layout renders
 * before a project is selected).
 */
export function useTodos(projectId: string | undefined, params: TodoListQuery = {}) {
  return useQuery({
    queryKey: projectId ? todosKeys.list(projectId, params) : ['todos-disabled'],
    queryFn: () => listTodos(projectId as string, params),
    enabled: Boolean(projectId),
  });
}
