import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTodo, deleteTodo, moveTodo, updateTodo } from '../../../api/todos';
import type { CreateTodoRequest, MoveTodoRequest, Todo, UpdateTodoRequest } from '../../../types/api';
import { todosKeys } from './useTodos';
import { projectsKeys } from '../../projects/hooks/useProjects';
import { applyOptimisticReorder, applyOptimisticMove } from '../lib/reorderUtils';
import { sprintsKeys } from './useSprints';

export function useCreateTodo(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTodoRequest) => createTodo(projectId, body),
    meta: { successMessage: 'Todo created.' },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: todosKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: ['board'] });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useUpdateTodo(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { todoId: string; body: UpdateTodoRequest }) =>
      updateTodo(args.todoId, args.body),
    meta: { successMessage: 'Todo updated.' },
    onSuccess: (updatedTodo: Todo) => {
      qc.setQueryData(['todo', updatedTodo.id], updatedTodo);
      void qc.invalidateQueries({ queryKey: todosKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: ['board'] });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useDeleteTodo(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (todoId: string) => deleteTodo(todoId),
    meta: { successMessage: 'Todo deleted.' },
    onSuccess: (_data, todoId) => {
      qc.removeQueries({ queryKey: ['todo', todoId] });
      void qc.invalidateQueries({ queryKey: todosKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: ['board'] });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

/**
 * BL-5 + BL-7: Optimistic todo move.
 *
 * Handles three cases:
 *   A) Backlog reorder: sprintId === undefined, overId present
 *      → optimistic reorder within the backlog list
 *
 *   B) Cross-container DnD (backlog → sprint or sprint → backlog or sprint → sprint):
 *      sprintId is set (null | string) and overId + sourceSprintId are present
 *      → optimistic: remove todo from source list, insert at position in target list
 *
 *   C) Menu move (no overId):
 *      No optimistic update applied — server re-syncs immediately via onSettled
 *
 * `sourceSprintId`: the list the todo is coming FROM.
 *   - null   = backlog
 *   - string = a sprint id
 *   If omitted, case B is not triggered (safe default for menu moves).
 */
export function useMoveTodo(projectId: string) {
  const qc = useQueryClient();

  const getListKey = (sprintId: string | null | undefined) =>
    sprintId === null || sprintId === undefined || sprintId === 'backlog'
      ? todosKeys.list(projectId, { sprintId: 'backlog' })
      : todosKeys.list(projectId, { sprintId });

  return useMutation({
    mutationFn: (args: {
      todoId: string;
      body: MoveTodoRequest;
      overId?: string;
      /** The sprintId the todo is moving FROM — null = backlog. Undefined = unknown (skip optimistic). */
      sourceSprintId?: string | null;
    }) => moveTodo(args.todoId, args.body),
    meta: { successMessage: 'Todo moved.' },

    onMutate: async (args) => {
      const { todoId, body, overId, sourceSprintId } = args;

      // Reorder within the backlog or within one sprint.
      const isSameListReorder = body.sprintId === undefined && overId !== undefined;

      if (isSameListReorder) {
        const key = getListKey(sourceSprintId);
        await qc.cancelQueries({ queryKey: key });
        const snapshot = qc.getQueryData<Todo[]>(key);
        if (snapshot) {
          qc.setQueryData<Todo[]>(key, applyOptimisticReorder(snapshot, todoId, body.position));
        }
        return { snapshotSource: snapshot, sourceKey: key, snapshotTarget: undefined, targetKey: undefined };
      }

      // ── Case B: cross-container DnD ───────────────────────────────────────
      const isCrossContainer =
        body.sprintId !== undefined && overId !== undefined && sourceSprintId !== undefined;

      if (isCrossContainer) {
        const sourceKey = getListKey(sourceSprintId);
        const targetKey = getListKey(body.sprintId ?? null);

        // Cancel both lists to prevent stale overwrites.
        await Promise.all([
          qc.cancelQueries({ queryKey: sourceKey }),
          qc.cancelQueries({ queryKey: targetKey }),
        ]);

        const snapshotSource = qc.getQueryData<Todo[]>(sourceKey);
        const snapshotTarget = qc.getQueryData<Todo[]>(targetKey);

        const { newSource, newTarget } = applyOptimisticMove(
          snapshotSource ?? [],
          snapshotTarget ?? [],
          todoId,
          overId,
          body.position,
          body.sprintId ?? null,
        );

        qc.setQueryData<Todo[]>(sourceKey, newSource);
        qc.setQueryData<Todo[]>(targetKey, newTarget);

        return { snapshotSource, sourceKey, snapshotTarget, targetKey };
      }

      // ── Case C: menu move — no optimistic update ──────────────────────────
      return undefined;
    },

    onError: (_err, _args, context) => {
      if (!context) return;
      if (context.snapshotSource !== undefined) {
        qc.setQueryData<Todo[]>(context.sourceKey!, context.snapshotSource);
      }
      if (context.snapshotTarget !== undefined) {
        qc.setQueryData<Todo[]>(context.targetKey!, context.snapshotTarget);
      }
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: todosKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: ['board'] });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.all });
      // Also refresh sprints so stats (todo count, points) update.
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
    },
  });
}
