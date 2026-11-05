import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeSprint,
  createSprint,
  deleteSprint,
  getSprintBoard,
  startSprint,
  updateSprint,
} from '../../../api/sprints';
import { generateSprintSummary as aiGenerateSummary } from '../../../api/ai';
import type {
  CompleteSprintRequest,
  CreateSprintRequest,
  MoveTodoRequest,
  Sprint,
  SprintBoardResponse,
  Todo,
  TodoStatus,
  UpdateSprintRequest,
} from '../../../types/api';
import { sprintsKeys } from '../../backlog/hooks/useSprints';
import { todosKeys } from '../../backlog/hooks/useTodos';
import { projectsKeys } from '../../projects/hooks/useProjects';
import { moveTodo } from '../../../api/todos';

// ─── Query key factory for board data ────────────────────────────────────────

export const boardKeys = {
  board: (sprintId: string) => ['board', sprintId] as const,
};

// ─── Board data hook ──────────────────────────────────────────────────────────

export function useSprintBoard(sprintId: string | undefined) {
  return useQuery({
    queryKey: sprintId ? boardKeys.board(sprintId) : ['board-disabled'],
    queryFn: () => getSprintBoard(sprintId as string),
    enabled: Boolean(sprintId),
  });
}

// ─── SPR-1 ────────────────────────────────────────────────────────────────────

export function useCreateSprint(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSprintRequest) => createSprint(projectId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
    },
  });
}

// ─── SPR-2 edit ───────────────────────────────────────────────────────────────

export function useUpdateSprint(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { sprintId: string; body: UpdateSprintRequest }) =>
      updateSprint(args.sprintId, args.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
    },
  });
}

// ─── SPR-2 delete ─────────────────────────────────────────────────────────────

export function useDeleteSprint(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => deleteSprint(sprintId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: todosKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
    },
  });
}

// ─── SPR-3: Start sprint ──────────────────────────────────────────────────────

export function useStartSprint(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { sprintId: string; startDate: string; endDate: string }) =>
      startSprint(args.sprintId, {
        startDate: args.startDate,
        endDate: args.endDate,
      }),
    onSuccess: (updatedSprint: Sprint) => {
      // Refresh the board for the newly active sprint.
      void qc.invalidateQueries({ queryKey: boardKeys.board(updatedSprint.id) });
      // Refresh the sprint list so planned→active transition is reflected.
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
    },
  });
}

// ─── SPR-5: Move a todo on the board ─────────────────────────────────────────
export function useMoveBoardTodo(projectId: string, sprintId: string) {
  const qc = useQueryClient();
  const boardKey = boardKeys.board(sprintId);

  return useMutation({
    mutationFn: (args: {
      todoId: string;
      body: MoveTodoRequest;
    }) => moveTodo(args.todoId, args.body),

    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: boardKey });
      const snapshot = qc.getQueryData<SprintBoardResponse>(boardKey);

      if (snapshot) {
        const { columns } = snapshot;
        const newStatus = (args.body.status ?? 'todo') as TodoStatus;
        const position = args.body.position;

        // Find the todo across all columns.
        let moved: Todo | undefined;
        const newColumns = Object.fromEntries(
          (Object.entries(columns) as [TodoStatus, Todo[]][]).map(([status, todos]) => {
            const found = todos.find((t) => t.id === args.todoId);
            if (found) moved = found;
            return [status, todos.filter((t) => t.id !== args.todoId)];
          }),
        ) as Record<TodoStatus, Todo[]>;

        if (moved) {
          const col = [...(newColumns[newStatus] ?? [])];
          col.splice(Math.max(0, Math.min(position, col.length)), 0, {
            ...moved,
            status: newStatus,
          });
          newColumns[newStatus] = col;
        }

        qc.setQueryData<SprintBoardResponse>(boardKey, {
          ...snapshot,
          columns: newColumns,
        });
      }

      return { snapshot };
    },

    onError: (_err, _args, context) => {
      if (context?.snapshot) {
        qc.setQueryData<SprintBoardResponse>(boardKey, context.snapshot);
      }
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: boardKey });
      // Board stats → project sidebar stats.
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      // Keep the sprint list's live stats in sync.
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
    },
  });
}

// ─── SPR-6: Complete sprint ───────────────────────────────────────────────────

export function useCompleteSprint(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { sprintId: string; body: CompleteSprintRequest }) =>
      completeSprint(args.sprintId, args.body),
    onSuccess: (updatedSprint: Sprint) => {
      // Completed sprint todos were moved → refresh backlog and sprint list.
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: todosKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: boardKeys.board(updatedSprint.id) });
      void qc.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
    },
  });
}

// ─── AI-4: Generate sprint summary ───────────────────────────────────────────

export function useGenerateSprintSummary(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => aiGenerateSummary(sprintId),
    onSuccess: (_data, sprintId) => {
      // Refresh the sprint list so the summary field is populated.
      void qc.invalidateQueries({ queryKey: sprintsKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: boardKeys.board(sprintId) });
    },
  });
}
