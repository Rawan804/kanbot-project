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
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import {
  AlertTriangleIcon,
  ArrowUpDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  InboxIcon,
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
  const [sort, setSort] = useState<BacklogSort>('manual');
  const [backlogCollapsed, setBacklogCollapsed] = useState(false);
  const deferredSearch = useDeferredValue(search);

  // Dialog state — null = closed, 'create' = new todo form, Todo = edit form
  const [selectedTodo, setSelectedTodo] = useState<Todo | 'create' | null>(null);
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
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([]);
  const [bulkSprintId, setBulkSprintId] = useState('');
  const [bulkPriority, setBulkPriority] = useState<TodoPriority | ''>('');
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
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
    if (routeState?.openCreateTodo || routeState?.openTodoId) {
      navigate(location.pathname, { replace: true, state: null });
    }
  };

  const hasFilters = Boolean(deferredSearch || priorityFilter || typeFilter || labelFilter);
  // Reordering by drag only makes sense when the list is shown in its stored order.
  const reorderPaused = hasFilters || sort !== 'manual';

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
  const visibleTodos = useMemo(() => sortTodos(filteredTodos, sort), [filteredTodos, sort]);
  const selectedBacklogTodos = (allTodos ?? []).filter((todo) =>
    selectedTodoIds.includes(todo.id),
  );
  const allVisibleSelected =
    filteredTodos.length > 0 && filteredTodos.every((todo) => selectedTodoIds.includes(todo.id));
  const backlogOpen = !backlogCollapsed || activeTodo !== null;

  const clearFilters = () => {
    setSearch('');
    setPriorityFilter('');
    setTypeFilter('');
    setLabelFilter('');
  };

  const exportCsv = () => {
    if (!allTodos) return;
    downloadTextFile(`${project?.key ?? 'backlog'}-backlog.csv`, todosToCsv(allTodos), 'text/csv');
  };
  const exportMarkdown = () => {
    if (!allTodos) return;
    downloadTextFile(
      `${project?.key ?? 'backlog'}-backlog.md`,
      `# ${project?.name ?? 'Project'} backlog\n\n${todosToMarkdown(allTodos)}\n`,
      'text/markdown',
    );
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
    setSelectedTodoIds((current) => current.filter((id) => !queued.some((todo) => todo.id === id)));
    if (pendingDeleteTimerRef.current !== null) window.clearTimeout(pendingDeleteTimerRef.current);
    pendingDeleteTimerRef.current = window.setTimeout(() => {
      const batch = pendingDeleteTodosRef.current;
      pendingDeleteTodosRef.current = [];
      pendingDeleteTimerRef.current = null;
      setPendingDeleteTodos([]);
      for (const todo of batch) {
        deleteTodoMutate(todo.id, {
          onError: (err) => setBulkError(`Could not delete ${todo.key}: ${getErrorMessage(err)}`),
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

  const handleSelectTodo = (todoId: string, selected: boolean) => {
    setSelectedTodoIds((current) =>
      selected
        ? current.includes(todoId) ? current : [...current, todoId]
        : current.filter((id) => id !== todoId),
    );
    setBulkError(null);
    setBulkSuccess(null);
  };

  const handleInlineUpdate = (todo: Todo, changes: UpdateTodoRequest) => {
    updateTodo.mutate(
      { todoId: todo.id, body: changes },
      { onError: (err) => showMoveError(getErrorMessage(err)) },
    );
  };

  const handleSelectVisible = (selected: boolean) => {
    const visibleIds = new Set(filteredTodos.map((todo) => todo.id));
    setSelectedTodoIds((current) =>
      selected
        ? [...new Set([...current, ...visibleIds])]
        : current.filter((id) => !visibleIds.has(id)),
    );
  };

  const handleBulkMove = async () => {
    if (selectedBacklogTodos.length === 0) return;
    setBulkPending(true);
    setBulkError(null);
    let completed = 0;
    try {
      for (const [position, todo] of selectedBacklogTodos.entries()) {
        await moveTodo.mutateAsync({
          todoId: todo.id,
          body: { sprintId: bulkSprintId || null, position },
          sourceSprintId: null,
        });
        completed += 1;
      }
      setSelectedTodoIds([]);
      setBulkSuccess(`Moved ${completed} ${completed === 1 ? 'todo' : 'todos'}.`);
    } catch (err) {
      setSelectedTodoIds(selectedBacklogTodos.slice(completed).map((todo) => todo.id));
      setBulkError(`Moved ${completed} of ${selectedBacklogTodos.length}. ${getErrorMessage(err)}`);
    } finally {
      setBulkPending(false);
    }
  };

  const handleBulkPriority = async () => {
    if (selectedBacklogTodos.length === 0 || !bulkPriority) return;
    setBulkPending(true);
    setBulkError(null);
    let completed = 0;
    try {
      for (const todo of selectedBacklogTodos) {
        await updateTodo.mutateAsync({ todoId: todo.id, body: { priority: bulkPriority } });
        completed += 1;
      }
      setSelectedTodoIds([]);
      setBulkSuccess(`Updated priority for ${completed} ${completed === 1 ? 'todo' : 'todos'}.`);
    } catch (err) {
      setSelectedTodoIds(selectedBacklogTodos.slice(completed).map((todo) => todo.id));
      setBulkError(`Updated ${completed} of ${selectedBacklogTodos.length}. ${getErrorMessage(err)}`);
    } finally {
      setBulkPending(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedBacklogTodos.length === 0) return;
    queueTodoDeletion(selectedBacklogTodos);
    setSelectedTodoIds([]);
    setBulkDeleteOpen(false);
    setBulkSuccess(`Deletion queued for ${selectedBacklogTodos.length} ${selectedBacklogTodos.length === 1 ? 'todo' : 'todos'}.`);
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
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0 max-w-2xl">
            <p className="flex items-center gap-2 text-sm font-medium text-[color:var(--kb-muted)]">
              <span className="truncate">{project?.name ?? 'Project'}</span>
              {project?.key && <span className="kb-pill kb-tone-lav font-mono">{project.key}</span>}
            </p>
            <h1 className="mt-1 text-[2rem] font-semibold leading-tight tracking-tight text-[color:var(--kb-text)]">
              Backlog
            </h1>
            {project?.description && (
              <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-[color:var(--kb-muted)]">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {allTodos && allTodos.length > 0 && (
              <ExportMenu onCsv={exportCsv} onMarkdown={exportMarkdown} />
            )}
            <Button
              variant="secondary"
              onClick={() => setSprintDialog({ open: true, sprint: null })}
            >
              <SprintsIcon className="h-4 w-4" />
              Create sprint
            </Button>
            <Button onClick={() => setSelectedTodo('create')}>
              <PlusIcon className="h-4 w-4" />
              Create todo
            </Button>
          </div>
        </header>

        {!isLoading && !isError && stats.total > 0 && <StatsBar stats={stats} />}

        {/* Search, filters, sorting */}
        {!isLoading && !isError && (
          <FilterToolbar
            search={search}
            searchInputRef={searchInputRef}
            priorityFilter={priorityFilter}
            typeFilter={typeFilter}
            labelFilter={labelFilter}
            sort={sort}
            labels={[...new Set((allTodos ?? []).flatMap((todo) => todo.labels))].sort()}
            hasFilters={hasFilters}
            allVisibleSelected={allVisibleSelected}
            onSelectVisible={handleSelectVisible}
            onSearch={setSearch}
            onPriority={setPriorityFilter}
            onType={setTypeFilter}
            onLabel={setLabelFilter}
            onSort={setSort}
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

        {selectedTodoIds.length > 0 && (
          <div className="kb-notice kb-tone-lav flex-wrap gap-2">
            <span className="mr-auto text-sm font-semibold">
              {selectedTodoIds.length} selected
            </span>
            <select
              aria-label="Move selected todos to sprint"
              value={bulkSprintId}
              onChange={(event) => setBulkSprintId(event.target.value)}
              className={selectClass}
            >
              <option value="">Backlog</option>
              {eligibleSprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
              ))}
            </select>
            <Button size="sm" variant="secondary" disabled={bulkPending} onClick={() => void handleBulkMove()}>
              Move
            </Button>
            <select
              aria-label="Change selected todo priority"
              value={bulkPriority}
              onChange={(event) => setBulkPriority(event.target.value as TodoPriority | '')}
              className={selectClass}
            >
              <option value="">Set priority</option>
              {(TODO_PRIORITIES as readonly TodoPriority[]).map((priority) => (
                <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
              ))}
            </select>
            <Button size="sm" variant="secondary" disabled={bulkPending || !bulkPriority} onClick={() => void handleBulkPriority()}>
              Apply
            </Button>
            <Button size="sm" variant="danger-ghost" disabled={bulkPending} onClick={() => setBulkDeleteOpen(true)}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" disabled={bulkPending} onClick={() => setSelectedTodoIds([])}>
              Clear
            </Button>
          </div>
        )}

        {pendingDeleteTodos.length > 0 && (
          <div role="status" className="kb-notice kb-tone-sand">
            <span className="min-w-0 flex-1 truncate">
              {pendingDeleteTodos.length === 1
                ? `${pendingDeleteTodos[0].key} will be deleted in 5 seconds.`
                : `${pendingDeleteTodos.length} todos will be deleted in 5 seconds.`}
            </span>
            <button
              type="button"
              onClick={undoTodoDeletion}
              className="shrink-0 font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
            >
              Undo
            </button>
          </div>
        )}

        {/* Move/action error banner */}
        {moveError && (
          <div role="alert" className="kb-notice kb-tone-rose">
            <AlertTriangleIcon className="h-4 w-4 shrink-0" />
            <span>{moveError}</span>
            <button
              type="button"
              onClick={() => setMoveError(null)}
              aria-label="Dismiss error"
              className="ml-auto rounded-full p-1 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)] dark:hover:bg-white/10"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        {undoMove && (
          <div role="status" className="kb-notice kb-card text-[color:var(--kb-text)]">
            <span className="min-w-0 flex-1 truncate">{undoMove.key} moved.</span>
            <button
              type="button"
              onClick={handleUndoMove}
              className="shrink-0 font-semibold text-[color:var(--kb-primary)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
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
              className="kb-icon-btn h-7 w-7"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {bulkError && (
          <p role="alert" className="kb-notice kb-tone-rose">
            {bulkError}
          </p>
        )}
        {bulkSuccess && (
          <p role="status" className="kb-notice kb-tone-sage">
            {bulkSuccess}
          </p>
        )}

        {/* Filter / sort notice */}
        {!isLoading && !isError && reorderPaused && filteredTodos.length > 0 && (
          <div className="kb-notice kb-tone-neutral py-2 text-xs">
            <InfoIcon className="h-4 w-4 shrink-0" />
            <span>Drag-and-drop reordering is paused while filters or sorting are active.</span>
            <span className="ml-auto flex items-center gap-3">
              {sort !== 'manual' && (
                <button
                  type="button"
                  onClick={() => setSort('manual')}
                  className="font-semibold text-[color:var(--kb-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
                >
                  Reset sort
                </button>
              )}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-semibold text-[color:var(--kb-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
                >
                  Clear filters
                </button>
              )}
            </span>
          </div>
        )}

        {/* Sprint loading */}
        {sprintsLoading && (
          <div className="flex items-center gap-2 text-sm text-[color:var(--kb-muted)]">
            <Spinner className="h-4 w-4 text-[color:var(--kb-primary)]" />
            Loading sprints...
          </div>
        )}

        {/* Planned sprint sections */}
        {!sprintsLoading && plannedSprints.length > 0 && (
          <section className="space-y-3" aria-label="Planned sprints">
            <h2 className="px-1 text-base font-semibold tracking-tight text-[color:var(--kb-text)]">
              Planned sprints
            </h2>
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
                onAddTodo={() => setSelectedTodo('create')}
                onTodoDelete={setDeletingTodo}
                onMoveTo={(todo, targetSprintId, sourceSprintId) =>
                  handleMoveTo(todo, targetSprintId, sourceSprintId)
                }
                onMoveToTop={handleSprintMoveToTop}
                onMoveToBottom={handleSprintMoveToBottom}
              />
            ))}
          </section>
        )}

        {/* Backlog loading */}
        {isLoading && (
          <div className="kb-card flex items-center justify-center gap-3 rounded-[1.75rem] py-16">
            <Spinner className="h-6 w-6 text-[color:var(--kb-primary)]" />
            <span className="text-sm text-[color:var(--kb-muted)]">Loading backlog...</span>
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
          <section className="space-y-3" aria-label="Backlog">
            {stats.total > 0 && (
              <div className="flex items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={() => setBacklogCollapsed((c) => !c)}
                  aria-expanded={backlogOpen}
                  aria-label={backlogOpen ? 'Collapse backlog' : 'Expand backlog'}
                  className="kb-icon-btn h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
                >
                  {backlogOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
                <h2 className="text-base font-semibold tracking-tight text-[color:var(--kb-text)]">
                  Backlog
                </h2>
                <span className="kb-pill kb-tone-neutral">
                  {hasFilters ? `${filteredTodos.length} of ${stats.total}` : stats.total}{' '}
                  {stats.total === 1 ? 'item' : 'items'}
                </span>
              </div>
            )}

            {stats.total === 0 && (
              <EmptyState
                illustration
                icon={<InboxIcon className="h-7 w-7" />}
                title="Your backlog is empty"
                description="Capture the first idea, or let AI draft a starting list from a short description."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => setSelectedTodo('create')}>
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
                description="Try a different search, or clear the filters to see everything."
                action={
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    <XIcon className="h-3.5 w-3.5" />
                    Clear filters
                  </Button>
                }
              />
            )}

            {visibleTodos.length > 0 && backlogOpen && (
              <SortableContext
                id={BACKLOG_LIST_ID}
                items={visibleTodos.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  ref={setBacklogDropRef}
                  className={cn(
                    'min-h-[3rem] space-y-3 rounded-[1.5rem] transition-colors',
                    isOverBacklog && 'bg-[color:var(--kb-lav-bg)] p-2',
                  )}
                  role="list"
                  aria-label="Backlog todos"
                >
                  {visibleTodos.map((todo) => (
                    <div key={todo.id} role="listitem">
                      <TodoRow
                        todo={todo}
                        onOpen={(t) => setSelectedTodo(t)}
                        onDelete={setDeletingTodo}
                        onMoveToTop={handleMoveToTop}
                        onMoveToBottom={handleMoveToBottom}
                        sprints={eligibleSprints}
                        onMoveTo={(t, sprintId) => handleMoveTo(t, sprintId, null)}
                        sortingDisabled={reorderPaused}
                        selected={selectedTodoIds.includes(todo.id)}
                        onSelect={handleSelectTodo}
                        onInlineUpdate={handleInlineUpdate}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            )}

            {projectId && backlogOpen && <QuickCreate projectId={projectId} />}
          </section>
        )}

        {/* Details dialog */}
        {dialogTodo && projectId && (
          <TodoDetailsDialog
            todo={dialogTodo === 'create' ? null : dialogTodo}
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
                <span className="font-semibold text-[color:var(--kb-text)]">
                  {deletingTodo.key}: {deletingTodo.title}
                </span>
                ?
              </p>
              <p className="mt-1.5">This action cannot be undone.</p>
              {deleteTodo.isError && (
                <p role="alert" className="mt-3 text-sm font-medium text-[color:var(--kb-rose-fg)]">
                  {getErrorMessage(deleteTodo.error)}
                </p>
              )}
            </>
          )}
        </ConfirmDialog>

        <ConfirmDialog
          open={bulkDeleteOpen}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={() => void handleBulkDelete()}
          title={`Delete ${selectedBacklogTodos.length} selected todos?`}
          confirmLabel={`Delete ${selectedBacklogTodos.length}`}
          tone="danger"
          loading={bulkPending}
        >
          <p>This will permanently delete the selected todos. This action cannot be undone.</p>
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
          <div className="kb-card pointer-events-none flex items-center gap-3 rounded-[1.25rem] px-4 py-3 kb-shadow-lg ring-2 ring-[color:var(--kb-primary)]">
            <span className="font-mono text-[11px] font-medium text-[color:var(--kb-muted)]">
              {activeTodo.key}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--kb-text)]">
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

// ─── Sorting ──────────────────────────────────────────────────────────────────

type BacklogSort = 'manual' | 'priority' | 'due' | 'points' | 'newest' | 'title';

const SORT_LABELS: Record<BacklogSort, string> = {
  manual: 'Manual order',
  priority: 'Priority',
  due: 'Due date',
  points: 'Story points',
  newest: 'Newest first',
  title: 'Title A–Z',
};

const PRIORITY_RANK: Record<TodoPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** Pure, non-mutating sort used for display only; the stored order is never changed. */
function sortTodos(todos: Todo[], sort: BacklogSort): Todo[] {
  if (sort === 'manual') return todos;
  const copy = [...todos];
  switch (sort) {
    case 'priority':
      return copy.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    case 'due':
      return copy.sort((a, b) => {
        if (a.dueDate === b.dueDate) return 0;
        if (a.dueDate === null) return 1;
        if (b.dueDate === null) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    case 'points':
      return copy.sort((a, b) => (b.storyPoints ?? -1) - (a.storyPoints ?? -1));
    case 'newest':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
  }
}

// ─── Export menu ──────────────────────────────────────────────────────────────

function ExportMenu({ onCsv, onMarkdown }: { onCsv: () => void; onMarkdown: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <Button
        variant="ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <DownloadIcon className="h-4 w-4" />
        Export
      </Button>
      {open && (
        <div role="menu" aria-label="Export backlog" className="kb-menu absolute right-0 top-full z-20 mt-1.5 min-w-[11rem]">
          <button
            type="button"
            role="menuitem"
            className="kb-menu-item"
            onClick={() => {
              setOpen(false);
              onCsv();
            }}
          >
            Export CSV
          </button>
          <button
            type="button"
            role="menuitem"
            className="kb-menu-item"
            onClick={() => {
              setOpen(false);
              onMarkdown();
            }}
          >
            Export Markdown
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AI tools (inline, lives in the toolbar) ──────────────────────────────────

function AIToolsInline({
  onGenerateTodos,
  onPlanSprint,
}: {
  onGenerateTodos: () => void;
  onPlanSprint: () => void;
}) {
  const btn =
    'kb-tone-lav inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-[filter] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)] dark:hover:brightness-110';
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

// ─── Stats ────────────────────────────────────────────────────────────────────

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
    .join(', ');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Metric value={stats.total} label={stats.total === 1 ? 'item' : 'items'} />
      <Metric value={stats.points} label="points" />
      <Metric value={`${stats.estimated}/${stats.total}`} label="estimated" />
      {typeSummary && <span className="kb-chip kb-muted">{typeSummary}</span>}
      <div className="flex items-center gap-1.5 sm:ml-auto" aria-label="Items by priority">
        {(TODO_PRIORITIES as readonly TodoPriority[]).map((p) => {
          const count = stats.byPriority[p];
          if (!count) return null;
          return (
            <span key={p} className="inline-flex items-center gap-1.5">
              <PriorityBadge priority={p} />
              <span className="text-xs font-semibold text-[color:var(--kb-muted)]">{count}</span>
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
  sort: BacklogSort;
  labels: string[];
  hasFilters: boolean;
  allVisibleSelected: boolean;
  onSelectVisible: (selected: boolean) => void;
  onSearch: (v: string) => void;
  onPriority: (v: TodoPriority | '') => void;
  onType: (v: TodoType | '') => void;
  onLabel: (v: string) => void;
  onSort: (v: BacklogSort) => void;
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

const selectClass = 'kb-input kb-select';

function FilterToolbar({
  search,
  searchInputRef,
  priorityFilter,
  typeFilter,
  labelFilter,
  sort,
  labels,
  hasFilters,
  allVisibleSelected,
  onSelectVisible,
  onSearch,
  onPriority,
  onType,
  onLabel,
  onSort,
  onClear,
  trailing,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="kb-chip h-10 cursor-pointer px-4">
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={(event) => onSelectVisible(event.target.checked)}
          aria-label="Select all visible todos"
          className="kb-checkbox"
        />
        Select
      </label>
      {/* Search: min-w-0 + flex-1 prevents overflow */}
      <div className="relative min-w-0 flex-1 basis-48">
        <SearchIcon className="kb-muted pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          ref={searchInputRef}
          type="search"
          value={search}
          placeholder="Search todos"
          aria-label="Search todos"
          onChange={(e) => onSearch(e.target.value)}
          className="kb-input w-full pl-10"
        />
      </div>

      <select
        value={priorityFilter}
        aria-label="Filter by priority"
        data-active={priorityFilter !== ''}
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
        data-active={typeFilter !== ''}
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
        data-active={labelFilter !== ''}
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

      <div className="relative">
        <ArrowUpDownIcon className="kb-muted pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
        <select
          value={sort}
          aria-label="Sort backlog"
          data-active={sort !== 'manual'}
          onChange={(e) => onSort(e.target.value as BacklogSort)}
          className={cn(selectClass, 'pl-10')}
        >
          {(Object.keys(SORT_LABELS) as BacklogSort[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="kb-chip h-10 cursor-pointer px-4 hover:text-[color:var(--kb-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
        >
          <XIcon className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
      {trailing}
    </div>
  );
}
