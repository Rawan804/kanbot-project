import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  DragOverlay,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Sprint, Todo, TodoPriority, TodoType } from '../../../types/api';
import { TODO_PRIORITIES, TODO_TYPES } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { Button } from '../../../shared/components/Button';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import {
  AlertTriangleIcon,
  BacklogIcon,
  InfoIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  SprintsIcon,
  XIcon,
} from '../../../shared/components/icons';
import { PriorityBadge } from '../../../shared/components/PriorityBadge';
import type { UpdateTodoRequest } from '../../../types/api';
import { useProject } from '../../projects/hooks/useProjects';
import { todosKeys, useTodos } from '../hooks/useTodos';
import { useDeleteTodo, useMoveTodo, useUpdateTodo } from '../hooks/useTodoMutations';
import { useSprints } from '../hooks/useSprints';
import {
  estimatedCount,
  priorityCounts,
  totalPoints,
  typeCounts,
} from '../lib/backlogStats';
import { computeDropPosition } from '../lib/reorderUtils';
import { getErrorMessage } from '../../../lib/api-error';
import { downloadTextFile, todosToCsv, todosToMarkdown } from '../../../shared/lib/exportTodos';
import { TodoRow } from './TodoRow';
import { QuickCreate } from './QuickCreate';
import { TodoDetailsDialog } from './TodoDetailsDialog';
import { SprintSection, BACKLOG_LIST_ID } from '../../sprints/components/SprintSection';
import { SprintFormDialog } from '../../sprints/components/SprintFormDialog';
import { StartSprintDialog } from '../../sprints/components/StartSprintDialog';
import { GenerateTodosDialog } from '../../ai/components/GenerateTodosDialog';
import { PlanSprintDialog } from '../../ai/components/PlanSprintDialog';

/**
 * BL-1 / BL-2 / BL-4 / BL-5 / BL-6 / BL-7 / SPR-1 / SPR-2
 *
 * Single DndContext wraps BOTH the planned-sprint sections AND the backlog,
 * enabling cross-container drag-and-drop (backlog <-> sprint, sprint <-> sprint).
 */
export function BacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: project } = useProject(projectId);

  const { data: allTodos, isLoading, isError, error, refetch } = useTodos(projectId, {
    sprintId: 'backlog',
  });

  const { data: allSprints, isLoading: sprintsLoading } = useSprints(projectId);

  const deleteTodo = useDeleteTodo(projectId ?? '');
  const { mutate: deleteTodoMutate } = deleteTodo;
  const moveTodo = useMoveTodo(projectId ?? '');
  const updateTodo = useUpdateTodo(projectId ?? '');

  // Filter state
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | ''>('');
  const [typeFilter, setTypeFilter] = useState<TodoType | ''>('');
  const [labelFilter, setLabelFilter] = useState('');
  const deferredSearch = useDeferredValue(search);

  // Dialog state — null = closed, 'create' = new todo form, Todo = edit form
  const [selectedTodo, setSelectedTodo] = useState<Todo | 'create' | null>(null);
  const [createTodoSprintId, setCreateTodoSprintId] = useState<string | undefined>();
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);
  const [generateTodosOpen, setGenerateTodosOpen] = useState(false);
  const [planSprintOpen, setPlanSprintOpen] = useState(false);
  const [sprintDialog, setSprintDialog] = useState<{ open: boolean; sprint: Sprint | null }>({
    open: false,
    sprint: null,
  });
  const [moveError, setMoveError] = useState<string | null>(null);
  const moveErrorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [undoMove, setUndoMove] = useState<{
    todoId: string;
    key: string;
    previousSprintId: string | null;
    previousPosition: number;
  } | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const [startSprintTarget, setStartSprintTarget] = useState<Sprint | null>(null);
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);
  const [pendingDeleteTodos, setPendingDeleteTodos] = useState<Todo[]>([]);
  const pendingDeleteTodosRef = useRef<Todo[]>([]);
  const pendingDeleteTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const routeState = isBacklogRouteState(location.state) ? location.state : null;

  useEffect(() => {
    if (!routeState?.focusSearch || isLoading) return;
    searchInputRef.current?.focus();
    navigate(location.pathname, { replace: true, state: null });
  }, [isLoading, location.pathname, navigate, routeState?.focusSearch]);

  useEffect(
    () => () => {
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
      if (moveErrorRef.current) clearTimeout(moveErrorRef.current);
      if (pendingDeleteTimerRef.current !== null) {
        window.clearTimeout(pendingDeleteTimerRef.current);
        for (const todo of pendingDeleteTodosRef.current) deleteTodoMutate(todo.id);
      }
    },
    [deleteTodoMutate],
  );

  const routeTodo = routeState?.openTodoId
    ? allTodos?.find((todo) => todo.id === routeState.openTodoId)
    : undefined;
  const dialogTodo =
    selectedTodo ?? (routeState?.openCreateTodo ? 'create' : routeTodo ?? null);
  const closeDetails = () => {
    setSelectedTodo(null);
    setCreateTodoSprintId(undefined);
    if (routeState?.openCreateTodo || routeState?.openTodoId) {
      navigate(location.pathname, { replace: true, state: null });
    }
  };
  const openTodoCreate = (sprintId?: string) => {
    setCreateTodoSprintId(sprintId);
    setSelectedTodo('create');
  };

  const hasFilters = Boolean(deferredSearch || priorityFilter || typeFilter || labelFilter);

  const plannedSprints = useMemo(
    () => (allSprints ?? []).filter((s) => s.status === 'planned'),
    [allSprints],
  );

  const activeSprint = useMemo(
    () => (allSprints ?? []).find((s) => s.status === 'active'),
    [allSprints],
  );

  const eligibleSprints: Sprint[] = useMemo(
    () => (allSprints ?? []).filter((s) => s.status === 'planned' || s.status === 'active'),
    [allSprints],
  );

  const stats = useMemo(() => {
    const todos = allTodos ?? [];
    return {
      total: todos.length,
      points: totalPoints(todos),
      estimated: estimatedCount(todos),
      byPriority: priorityCounts(todos),
      byType: typeCounts(todos),
    };
  }, [allTodos]);

  const filteredTodos = useMemo(() => {
    const pendingIds = new Set(pendingDeleteTodos.map((todo) => todo.id));
    const todos = (allTodos ?? []).filter((todo) => !pendingIds.has(todo.id));
    const q = deferredSearch.trim().toLowerCase();
    return todos.filter((t) => {
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (typeFilter && t.type !== typeFilter) return false;
      if (labelFilter && !t.labels.includes(labelFilter)) return false;
      if (q) {
        return (
          t.key.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.labels.some((l) => l.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allTodos, deferredSearch, priorityFilter, typeFilter, labelFilter, pendingDeleteTodos]);
  const clearFilters = () => {
    setSearch('');
    setPriorityFilter('');
    setTypeFilter('');
    setLabelFilter('');
  };

  // ── DnD ───────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const showMoveError = (msg: string) => {
    setMoveError(msg);
    if (moveErrorRef.current) clearTimeout(moveErrorRef.current);
    moveErrorRef.current = setTimeout(() => setMoveError(null), 5000);
  };

  const showMoveUndo = (todo: Todo) => {
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    setUndoMove({
      todoId: todo.id,
      key: todo.key,
      previousSprintId: todo.sprintId,
      previousPosition: todo.order,
    });
    undoTimerRef.current = window.setTimeout(() => setUndoMove(null), 7000);
  };

  const queueTodoDeletion = (todos: Todo[]) => {
    const queued = [
      ...pendingDeleteTodosRef.current,
      ...todos.filter((todo) => !pendingDeleteTodosRef.current.some((item) => item.id === todo.id)),
    ];
    pendingDeleteTodosRef.current = queued;
    setPendingDeleteTodos(queued);
    if (pendingDeleteTimerRef.current !== null) window.clearTimeout(pendingDeleteTimerRef.current);
    pendingDeleteTimerRef.current = window.setTimeout(() => {
      const batch = pendingDeleteTodosRef.current;
      pendingDeleteTodosRef.current = [];
      pendingDeleteTimerRef.current = null;
      setPendingDeleteTodos([]);
      for (const todo of batch) {
        deleteTodoMutate(todo.id, {
          onError: (err) => showMoveError(`Could not delete ${todo.key}: ${getErrorMessage(err)}`),
        });
      }
    }, 5000);
  };

  const undoTodoDeletion = () => {
    if (pendingDeleteTimerRef.current !== null) window.clearTimeout(pendingDeleteTimerRef.current);
    pendingDeleteTimerRef.current = null;
    pendingDeleteTodosRef.current = [];
    setPendingDeleteTodos([]);
  };

  const handleUndoMove = () => {
    if (!undoMove) return;
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    moveTodo.mutate({
      todoId: undoMove.todoId,
      body: { sprintId: undoMove.previousSprintId, position: undoMove.previousPosition },
    }, {
      onError: (err) => showMoveError(getErrorMessage(err)),
    });
    setUndoMove(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const draggedId = String(event.active.id);
    const todoLists = queryClient.getQueriesData<Todo[]>({
      queryKey: todosKeys.all(projectId ?? ''),
    });
    setActiveTodo(
      todoLists.flatMap(([, todos]) => todos ?? []).find((todo) => todo.id === draggedId) ?? null,
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTodo(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedId = String(active.id);
    const overId = String(over.id);
    const originalTodo = queryClient
      .getQueriesData<Todo[]>({ queryKey: todosKeys.all(projectId ?? '') })
      .flatMap(([, todos]) => todos ?? [])
      .find((todo) => todo.id === draggedId);

    const sourceContainerId: string =
      (active.data.current?.sortable?.containerId as string | undefined) ??
      (allTodos?.find((t) => t.id === draggedId) ? BACKLOG_LIST_ID : '');

    const destContainerId: string =
      (over.data.current?.sortable?.containerId as string | undefined) ??
      (over.data.current?.sprintId as string | undefined) ??
      overId;

    const sourceIsBacklog = sourceContainerId === BACKLOG_LIST_ID;
    const destIsBacklog = destContainerId === BACKLOG_LIST_ID;
    const sortablePosition = over.data.current?.sortable?.index;
    const dropPosition =
      typeof sortablePosition === 'number'
        ? sortablePosition
        : typeof over.data.current?.position === 'number'
          ? over.data.current.position
          : 0;

    if (sourceContainerId === destContainerId) {
      const position =
        sourceIsBacklog && allTodos && typeof sortablePosition === 'number'
          ? computeDropPosition(allTodos, draggedId, overId)
          : dropPosition;
      moveTodo.mutate(
        {
          todoId: draggedId,
          body: { position },
          overId,
          sourceSprintId: sourceIsBacklog ? null : sourceContainerId,
        },
        {
          onSuccess: () => { if (originalTodo) showMoveUndo(originalTodo); },
          onError: (err) => showMoveError(getErrorMessage(err)),
        },
      );
    } else {
      const targetSprintId = destIsBacklog ? null : destContainerId;
      const sourceSprintId = sourceIsBacklog ? null : sourceContainerId;

      moveTodo.mutate(
        {
          todoId: draggedId,
          body: { sprintId: targetSprintId, position: dropPosition },
          overId,
          sourceSprintId,
        },
        {
          onSuccess: () => { if (originalTodo) showMoveUndo(originalTodo); },
          onError: (err) => showMoveError(getErrorMessage(err)),
        },
      );
    }
  };

  const handleMoveToTop = (todo: Todo) => {
    if (!allTodos) return;
    const currentIndex = allTodos.findIndex((t) => t.id === todo.id);
    if (currentIndex <= 0) return;
    moveTodo.mutate(
      { todoId: todo.id, body: { position: 0 }, overId: allTodos[0].id },
      {
        onSuccess: () => showMoveUndo(todo),
        onError: (err) => showMoveError(getErrorMessage(err)),
      },
    );
  };

  const handleMoveToBottom = (todo: Todo) => {
    if (!allTodos) return;
    const currentIndex = allTodos.findIndex((t) => t.id === todo.id);
    const lastIndex = allTodos.length - 1;
    if (currentIndex >= lastIndex) return;
    moveTodo.mutate(
      { todoId: todo.id, body: { position: lastIndex - 1 }, overId: allTodos[lastIndex].id },
      {
        onSuccess: () => showMoveUndo(todo),
        onError: (err) => showMoveError(getErrorMessage(err)),
      },
    );
  };

  const handleSprintMoveToTop = (todo: Todo) => {
    moveTodo.mutate(
      { todoId: todo.id, body: { position: 0 } },
      {
        onSuccess: () => showMoveUndo(todo),
        onError: (err) => showMoveError(getErrorMessage(err)),
      },
    );
  };

  const handleSprintMoveToBottom = (todo: Todo) => {
    moveTodo.mutate(
      { todoId: todo.id, body: { position: 9999 } },
      {
        onSuccess: () => showMoveUndo(todo),
        onError: (err) => showMoveError(getErrorMessage(err)),
      },
    );
  };

  const handleMoveTo = (
    todo: Todo,
    targetSprintId: string | null,
    sourceSprintId: string | null = null,
  ) => {
    moveTodo.mutate(
      { todoId: todo.id, body: { sprintId: targetSprintId, position: 0 }, sourceSprintId },
      { onError: (err) => showMoveError(getErrorMessage(err)) },
    );
  };

  const handleInlineUpdate = (todo: Todo, changes: UpdateTodoRequest) => {
    updateTodo.mutate(
      { todoId: todo.id, body: changes },
      { onError: (err) => showMoveError(getErrorMessage(err)) },
    );
  };

  const handleConfirmDelete = () => {
    if (!deletingTodo) return;
    const todoToDelete = deletingTodo;
    if (selectedTodo instanceof Object && 'id' in selectedTodo && selectedTodo.id === todoToDelete.id) setSelectedTodo(null);
    queueTodoDeletion([todoToDelete]);
    setDeletingTodo(null);
  };

  const { setNodeRef: setBacklogDropRef, isOver: isOverBacklog } = useDroppable({
    id: BACKLOG_LIST_ID,
    data: { sprintId: null, position: allTodos?.length ?? 0 },
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-5">
        <PageHeader
          title="Backlog"
          description="Organize upcoming work, prioritize tasks, and plan them into sprints."
          actions={
            <>
              {allTodos && allTodos.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadTextFile(`${project?.key ?? 'backlog'}-backlog.csv`, todosToCsv(allTodos), 'text/csv')}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadTextFile(`${project?.key ?? 'backlog'}-backlog.md`, `# ${project?.name ?? 'Project'} backlog\n\n${todosToMarkdown(allTodos)}\n`, 'text/markdown')}
                  >
                    Export Markdown
                  </Button>
                </>
              )}
              <Button
                variant="secondary"
                onClick={() => setSprintDialog({ open: true, sprint: null })}
              >
                <SprintsIcon className="h-4 w-4" />
                Create sprint
              </Button>
              <Button onClick={() => openTodoCreate()}>
                <PlusIcon className="h-4 w-4" />
                Create todo
              </Button>
            </>
          }
        />

        <div className="space-y-4 rounded-2xl border border-kanbot-border bg-kanbot-surface p-4 shadow-sm dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface">
          {!isLoading && !isError && stats.total > 0 && <StatsBar stats={stats} />}

          {!isLoading && !isError && (
            <FilterToolbar
              search={search}
              searchInputRef={searchInputRef}
              priorityFilter={priorityFilter}
              typeFilter={typeFilter}
              labelFilter={labelFilter}
              labels={[...new Set((allTodos ?? []).flatMap((todo) => todo.labels))].sort()}
              hasFilters={hasFilters}
              onSearch={setSearch}
              onPriority={setPriorityFilter}
              onType={setTypeFilter}
              onLabel={setLabelFilter}
              onClear={clearFilters}
              trailing={
                projectId ? (
                  <AIToolsInline
                    onGenerateTodos={() => setGenerateTodosOpen(true)}
                    onPlanSprint={() => setPlanSprintOpen(true)}
                  />
                ) : null
              }
            />
          )}
        </div>

        {pendingDeleteTodos.length > 0 && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
          >
            <span className="min-w-0 flex-1 truncate">
              {pendingDeleteTodos.length === 1
                ? `${pendingDeleteTodos[0].key} will be deleted in 5 seconds.`
                : `${pendingDeleteTodos.length} todos will be deleted in 5 seconds.`}
            </span>
            <button
              type="button"
              onClick={undoTodoDeletion}
              className="shrink-0 font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary"
            >
              Undo
            </button>
          </div>
        )}

        {/* Move/action error banner */}
        {moveError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          >
            <AlertTriangleIcon className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <span>{moveError}</span>
            <button
              type="button"
              onClick={() => setMoveError(null)}
              aria-label="Dismiss error"
              className="ml-auto text-red-400 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        {undoMove && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-kanbot-primary/20 bg-kanbot-surface px-4 py-3 text-sm text-kanbot-text shadow-sm dark:border-kanbot-primary/30 dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text"
          >
            <span className="min-w-0 flex-1 truncate">{undoMove.key} moved.</span>
            <button
              type="button"
              onClick={handleUndoMove}
              className="shrink-0 font-semibold text-kanbot-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-primary"
            >
              Undo
            </button>
            <button
              type="button"
              aria-label="Dismiss undo action"
              onClick={() => {
                if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
                setUndoMove(null);
              }}
              className="text-kanbot-muted hover:text-kanbot-text dark:text-kanbot-dark-muted dark:hover:text-kanbot-dark-text"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filter-active notice */}
        {!isLoading && !isError && hasFilters && filteredTodos.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-kanbot-border bg-kanbot-surface-elevated px-3 py-2 text-xs text-kanbot-muted dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface-elevated dark:text-kanbot-dark-muted">
            <InfoIcon className="h-4 w-4 shrink-0 text-kanbot-muted dark:text-kanbot-dark-muted" />
            <span>Drag-and-drop reordering is disabled while filters are active.</span>
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-kanbot-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-primary"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Sprint loading */}
        {sprintsLoading && (
          <div className="flex items-center gap-2 text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
            <Spinner className="h-4 w-4 text-kanbot-primary" />
            Loading sprints...
          </div>
        )}

        {/* Planned sprint sections */}
        {!sprintsLoading && plannedSprints.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-kanbot-text dark:text-kanbot-dark-text">
              Planned sprints
            </p>
            {plannedSprints.map((sprint) => (
              <SprintSection
                key={sprint.id}
                sprint={sprint}
                projectId={projectId ?? ''}
                eligibleSprints={eligibleSprints}
                onEdit={(s) => setSprintDialog({ open: true, sprint: s })}
                onStart={(s) => setStartSprintTarget(s)}
                hasActiveSprint={Boolean(activeSprint)}
                onTodoOpen={(t) => setSelectedTodo(t)}
                onAddTodo={() => openTodoCreate(sprint.id)}
                onTodoDelete={setDeletingTodo}
                onMoveTo={(todo, targetSprintId, sourceSprintId) =>
                  handleMoveTo(todo, targetSprintId, sourceSprintId)
                }
                onMoveToTop={handleSprintMoveToTop}
                onMoveToBottom={handleSprintMoveToBottom}
              />
            ))}
          </div>
        )}

        {/* Backlog loading */}
        {isLoading && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-kanbot-border bg-kanbot-surface py-16 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface">
            <Spinner className="h-6 w-6 text-kanbot-primary" />
            <span className="text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
              Loading backlog...
            </span>
          </div>
        )}

        {/* Error */}
        {isError && (
          <EmptyState
            tone="error"
            icon={<AlertTriangleIcon className="h-7 w-7" />}
            title="Couldn't load the backlog"
            description={getErrorMessage(error)}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {/* Main backlog content */}
        {!isLoading && !isError && (
          <>
            {stats.total > 0 && (
              <div className="flex items-center justify-between pt-1">
                <h2 className="kb-text text-base font-semibold">
                  Backlog
                </h2>
                <span className="text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
                  {hasFilters ? `${filteredTodos.length} of ${stats.total}` : stats.total}{' '}
                  {stats.total === 1 ? 'item' : 'items'}
                </span>
              </div>
            )}
            {stats.total === 0 && (
              <EmptyState
                icon={<BacklogIcon className="h-7 w-7" />}
                title="Your backlog is empty"
                description="Add todos to your backlog to start planning your work."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => openTodoCreate()}>
                      <PlusIcon className="h-4 w-4" />
                      Create todo
                    </Button>
                    <Button variant="secondary" onClick={() => setGenerateTodosOpen(true)}>
                      <SparklesIcon className="h-4 w-4" />
                      Generate with AI
                    </Button>
                  </div>
                }
              />
            )}

            {stats.total > 0 && filteredTodos.length === 0 && (
              <EmptyState
                icon={<SearchIcon className="h-7 w-7" />}
                title="No todos match your filters"
                description="Try adjusting the search or clearing the active filters."
                action={
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    <XIcon className="h-3.5 w-3.5" />
                    Clear filters
                  </Button>
                }
              />
            )}

            {filteredTodos.length > 0 && (
              <SortableContext
                id={BACKLOG_LIST_ID}
                items={filteredTodos.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  ref={setBacklogDropRef}
                  className={cn(
                    'min-h-[3rem] space-y-2 rounded-2xl transition-colors',
                    isOverBacklog &&
                      'bg-kanbot-primary-soft/60 border-kanbot-primary/30 dark:bg-kanbot-primary/10 dark:border-kanbot-primary/30',
                  )}
                  role="list"
                  aria-label="Backlog todos"
                >
                  {filteredTodos.map((todo) => (
                    <div key={todo.id} role="listitem">
                      <TodoRow
                        todo={todo}
                        onOpen={(t) => setSelectedTodo(t)}
                        onDelete={setDeletingTodo}
                        onMoveToTop={handleMoveToTop}
                        onMoveToBottom={handleMoveToBottom}
                        sprints={eligibleSprints}
                        onMoveTo={(t, sprintId) => handleMoveTo(t, sprintId, null)}
                        sortingDisabled={hasFilters}
                        onInlineUpdate={handleInlineUpdate}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            )}

            {projectId && <QuickCreate projectId={projectId} />}
          </>
        )}

        {/* Details dialog */}
        {dialogTodo && projectId && (
          <TodoDetailsDialog
            todo={dialogTodo === 'create' ? null : dialogTodo}
            initialSprintId={dialogTodo === 'create' ? createTodoSprintId : undefined}
            projectId={projectId}
            onClose={closeDetails}
            onDelete={(todo) => {
              setSelectedTodo(null);
              setDeletingTodo(todo);
              if (routeState?.openTodoId) {
                navigate(location.pathname, { replace: true, state: null });
              }
            }}
          />
        )}

        {/* Delete confirmation */}
        <ConfirmDialog
          open={deletingTodo !== null}
          onClose={() => setDeletingTodo(null)}
          onConfirm={handleConfirmDelete}
          title="Delete todo"
          confirmLabel="Delete"
          tone="danger"
          loading={deleteTodo.isPending}
        >
          {deletingTodo && (
            <>
              <p>
                Delete{' '}
                <span className="font-semibold text-kanbot-text dark:text-kanbot-dark-text">
                  {deletingTodo.key}: {deletingTodo.title}
                </span>
                ?
              </p>
              <p className="mt-1.5">This action cannot be undone.</p>
              {deleteTodo.isError && (
                <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                  {getErrorMessage(deleteTodo.error)}
                </p>
              )}
            </>
          )}
        </ConfirmDialog>

        {/* Sprint form dialog */}
        {projectId && (
          <SprintFormDialog
            open={sprintDialog.open}
            onClose={() => setSprintDialog({ open: false, sprint: null })}
            projectId={projectId}
            sprint={sprintDialog.sprint}
          />
        )}

        {/* Start sprint dialog */}
        {projectId && startSprintTarget && (
          <StartSprintDialog
            open={Boolean(startSprintTarget)}
            onClose={() => setStartSprintTarget(null)}
            sprint={startSprintTarget}
            projectId={projectId}
            hasActiveSprint={Boolean(activeSprint)}
            activeSprintName={activeSprint?.name}
            onStarted={(started) => {
              setStartSprintTarget(null);
              navigate(`/projects/${projectId}/board`);
              void started;
            }}
          />
        )}

        {/* AI dialogs */}
        {projectId && (
          <GenerateTodosDialog
            open={generateTodosOpen}
            onClose={() => setGenerateTodosOpen(false)}
            projectId={projectId}
          />
        )}
        {projectId && (
          <PlanSprintDialog
            open={planSprintOpen}
            onClose={() => setPlanSprintOpen(false)}
            projectId={projectId}
          />
        )}
      </div>

      {/* DragOverlay */}
      <DragOverlay>
        {activeTodo ? (
          <div className="flex items-center gap-2 rounded-lg border border-kanbot-primary/30 bg-kanbot-primary-soft px-3 py-2.5 shadow-xl opacity-90 pointer-events-none dark:bg-kanbot-dark-surface dark:border-kanbot-primary/40">
            <span className="font-mono text-[11px] font-medium text-kanbot-muted dark:text-kanbot-dark-muted">
              {activeTodo.key}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text">
              {activeTodo.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface BacklogRouteState {
  openCreateTodo?: boolean;
  focusSearch?: boolean;
  openTodoId?: string;
}

function isBacklogRouteState(state: unknown): state is BacklogRouteState {
  if (typeof state !== 'object' || state === null) return false;
  const value = state as Record<string, unknown>;
  return (
    value.openCreateTodo === true ||
    value.focusSearch === true ||
    typeof value.openTodoId === 'string'
  );
}

// ─── AI tools (inline, lives in the header panel) ─────────────────────────────

function AIToolsInline({
  onGenerateTodos,
  onPlanSprint,
}: {
  onGenerateTodos: () => void;
  onPlanSprint: () => void;
}) {
  const btn =
    'inline-flex h-10 items-center gap-1.5 rounded-full bg-kanbot-primary-soft px-4 text-sm font-semibold text-kanbot-primary transition-colors hover:bg-kanbot-primary hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-primary dark:hover:bg-kanbot-primary dark:hover:text-kanbot-dark-background';
  return (
    <div className="flex items-center gap-2 lg:ml-auto">
      <button type="button" onClick={onGenerateTodos} className={btn}>
        <SparklesIcon className="h-4 w-4" />
        Generate todos
      </button>
      <button type="button" onClick={onPlanSprint} className={btn}>
        <SprintsIcon className="h-4 w-4" />
        Plan sprint
      </button>
    </div>
  );
}

// ─── Stats (single compact row inside the header panel) ───────────────────────

interface Stats {
  total: number;
  points: number;
  estimated: number;
  byPriority: Partial<Record<TodoPriority, number>>;
  byType: Partial<Record<TodoType, number>>;
}

const TYPE_LABELS: Record<TodoType, string> = {
  task: 'Tasks',
  story: 'Stories',
  bug: 'Bugs',
};

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <span className="kb-chip">
      <span className="font-semibold">{value}</span>
      <span className="kb-muted">{label}</span>
    </span>
  );
}

function StatsBar({ stats }: { stats: Stats }) {
  const typeSummary = (TODO_TYPES as readonly TodoType[])
    .filter((t) => stats.byType[t])
    .map((t) => `${stats.byType[t]} ${TYPE_LABELS[t].toLowerCase()}`)
    .join(' · ');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Metric value={stats.total} label={stats.total === 1 ? 'item' : 'items'} />
      <Metric value={stats.points} label="points" />
      <Metric value={`${stats.estimated}/${stats.total}`} label="estimated" />
      {typeSummary && <span className="kb-chip kb-muted">{typeSummary}</span>}
      <div className="flex items-center gap-2 sm:ml-auto">
        {(TODO_PRIORITIES as readonly TodoPriority[]).map((p) => {
          const count = stats.byPriority[p];
          if (!count) return null;
          return (
            <span
              key={p}
              className="kb-chip font-semibold"
            >
              <PriorityBadge priority={p} iconOnly />
              {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Filter Toolbar ──────────────────────────────────────────────────────────

interface FilterToolbarProps {
  search: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  priorityFilter: TodoPriority | '';
  typeFilter: TodoType | '';
  labelFilter: string;
  labels: string[];
  hasFilters: boolean;
  onSearch: (v: string) => void;
  onPriority: (v: TodoPriority | '') => void;
  onType: (v: TodoType | '') => void;
  onLabel: (v: string) => void;
  onClear: () => void;
  trailing?: ReactNode;
}

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const TYPE_LABELS_SINGULAR: Record<TodoType, string> = {
  task: 'Task',
  story: 'Story',
  bug: 'Bug',
};

const selectClass = 'kb-input cursor-pointer pr-8';

function FilterToolbar({
  search,
  searchInputRef,
  priorityFilter,
  typeFilter,
  labelFilter,
  labels,
  hasFilters,
  onSearch,
  onPriority,
  onType,
  onLabel,
  onClear,
  trailing,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search — min-w-0 + flex-1 prevents overflow */}
      <div className="relative min-w-0 basis-44 flex-1">
        <SearchIcon className="pointer-events-none kb-muted absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          ref={searchInputRef}
          type="search"
          value={search}
          placeholder="Search todos..."
          aria-label="Search todos"
          onChange={(e) => onSearch(e.target.value)}
          className="kb-input w-full pl-10"
        />
      </div>

      <select
        value={priorityFilter}
        aria-label="Filter by priority"
        onChange={(e) => onPriority(e.target.value as TodoPriority | '')}
        className={selectClass}
      >
        <option value="">Priority</option>
        {(TODO_PRIORITIES as readonly TodoPriority[]).map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>

      <select
        value={typeFilter}
        aria-label="Filter by type"
        onChange={(e) => onType(e.target.value as TodoType | '')}
        className={selectClass}
      >
        <option value="">Type</option>
        {(TODO_TYPES as readonly TodoType[]).map((t) => (
          <option key={t} value={t}>
            {TYPE_LABELS_SINGULAR[t]}
          </option>
        ))}
      </select>

      <select
        value={labelFilter}
        aria-label="Filter by label"
        onChange={(e) => onLabel(e.target.value)}
        className={selectClass}
      >
        <option value="">Label</option>
        {labels.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="kb-chip h-10 cursor-pointer px-4 hover:text-kanbot-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary"
        >
          <XIcon className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
      {trailing}
    </div>
  );
}
