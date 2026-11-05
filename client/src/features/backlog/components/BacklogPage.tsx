import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
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
  BacklogIcon,
  FilterIcon,
  InfoIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  SprintsIcon,
  XIcon,
} from '../../../shared/components/icons';
import { PriorityBadge } from '../../../shared/components/PriorityBadge';
import { useProject } from '../../projects/hooks/useProjects';
import { useTodos } from '../hooks/useTodos';
import { useDeleteTodo, useMoveTodo } from '../hooks/useTodoMutations';
import { useSprints } from '../hooks/useSprints';
import {
  estimatedCount,
  priorityCounts,
  totalPoints,
  typeCounts,
} from '../lib/backlogStats';
import { computeDropPosition } from '../lib/reorderUtils';
import { getErrorMessage } from '../../../lib/api-error';
import { TodoRow } from './TodoRow';
import { QuickCreate } from './QuickCreate';
import { TodoDetailsDialog } from './TodoDetailsDialog';
import { SprintSection, BACKLOG_LIST_ID } from '../../sprints/components/SprintSection';
import { SprintFormDialog } from '../../sprints/components/SprintFormDialog';
import { StartSprintDialog } from '../../sprints/components/StartSprintDialog';

/**
 * BL-1 / BL-2 / BL-4 / BL-5 / BL-6 / BL-7 / SPR-1 / SPR-2
 *
 * Single DndContext wraps BOTH the planned-sprint sections AND the backlog,
 * enabling cross-container drag-and-drop (backlog ↔ sprint, sprint ↔ sprint).
 *
 * Container IDs:
 *   'backlog'    = the main backlog list
 *   sprint.id    = each planned sprint's list
 *
 * The DragOverlay renders a ghosted copy of the dragged todo while dragging.
 * Each container has its own SortableContext scoped to its todos.
 */

export function BacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);

  // Full backlog — unfiltered
  const { data: allTodos, isLoading, isError, error, refetch } = useTodos(projectId, {
    sprintId: 'backlog',
  });

  const { data: allSprints, isLoading: sprintsLoading } = useSprints(projectId);

  const deleteTodo = useDeleteTodo(projectId ?? '');
  const moveTodo = useMoveTodo(projectId ?? '');

  // Filter state
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | ''>('');
  const [typeFilter, setTypeFilter] = useState<TodoType | ''>('');
  const deferredSearch = useDeferredValue(search);

  // Dialog state
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);
  const [sprintDialog, setSprintDialog] = useState<{ open: boolean; sprint: Sprint | null }>({
    open: false,
    sprint: null,
  });
  const [moveError, setMoveError] = useState<string | null>(null);
  const moveErrorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SPR-3: Start sprint dialog state
  const [startSprintTarget, setStartSprintTarget] = useState<Sprint | null>(null);

  // Track the currently dragged todo for DragOverlay rendering.
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const hasFilters = Boolean(deferredSearch || priorityFilter || typeFilter);

  // Planned sprints shown above the backlog.
  // API returns: active first, then planned oldest-first, then completed.
  const plannedSprints = useMemo(
    () => (allSprints ?? []).filter((s) => s.status === 'planned'),
    [allSprints],
  );

  // Active sprint (at most one per project).
  const activeSprint = useMemo(
    () => (allSprints ?? []).find((s) => s.status === 'active'),
    [allSprints],
  );

  // All eligible destinations for the "move to sprint" row menu.
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
    const todos = allTodos ?? [];
    const q = deferredSearch.trim().toLowerCase();
    return todos.filter((t) => {
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (typeFilter && t.type !== typeFilter) return false;
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
  }, [allTodos, deferredSearch, priorityFilter, typeFilter]);

  const clearFilters = () => {
    setSearch('');
    setPriorityFilter('');
    setTypeFilter('');
  };

  // ── DnD ───────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Find the active todo object for DragOverlay rendering.
  const activeTodo = activeDragId ? (allTodos ?? []).find((t) => t.id === activeDragId) : null;

  const showMoveError = (msg: string) => {
    setMoveError(msg);
    if (moveErrorRef.current) clearTimeout(moveErrorRef.current);
    moveErrorRef.current = setTimeout(() => setMoveError(null), 5000);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  /**
   * Central drag-end handler.
   *
   * We identify the source and destination containers from:
   *   active.data.current.sortable.containerId  → source container
   *   over.data.current.sprintId or over.id      → destination container
   *
   * If source === destination → same-list reorder.
   * If source !== destination → cross-container move.
   */
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedId = String(active.id);
    const overId = String(over.id);

    // Determine source container.
    const sourceContainerId: string =
      (active.data.current?.sortable?.containerId as string | undefined) ??
      (allTodos?.find((t) => t.id === draggedId) ? BACKLOG_LIST_ID : '');

    // Determine destination container.
    // `over` can be a todo item (its container is sortable.containerId) or a droppable zone (sprint.id).
    const destContainerId: string =
      (over.data.current?.sortable?.containerId as string | undefined) ??
      (over.data.current?.sprintId as string | undefined) ??
      overId;

    const sourceIsBacklog = sourceContainerId === BACKLOG_LIST_ID;
    const destIsBacklog = destContainerId === BACKLOG_LIST_ID;

    if (sourceContainerId === destContainerId) {
      // ── Same-list reorder ────────────────────────────────────────────────
      if (sourceIsBacklog && allTodos) {
        const position = computeDropPosition(allTodos, draggedId, overId);
        moveTodo.mutate(
          { todoId: draggedId, body: { position }, overId },
          { onError: (err) => showMoveError(getErrorMessage(err)) },
        );
      } else {
        // Same sprint reorder — position is relative to that sprint's list.
        // We don't have the sprint todos here, so send position: 0 and let
        // onSettled re-sync. TODO: load sprint todos here for accurate position.
        moveTodo.mutate(
          { todoId: draggedId, body: { position: 0 } },
          { onError: (err) => showMoveError(getErrorMessage(err)) },
        );
      }
    } else {
      // ── Cross-container move ─────────────────────────────────────────────
      const targetSprintId = destIsBacklog ? null : destContainerId;
      const sourceSprintId = sourceIsBacklog ? null : sourceContainerId;

      moveTodo.mutate(
        {
          todoId: draggedId,
          body: { sprintId: targetSprintId, position: 0 },
          overId: destIsBacklog ? overId : undefined,
          sourceSprintId,
        },
        { onError: (err) => showMoveError(getErrorMessage(err)) },
      );
    }
  };

  // ── Keyboard "move to top/bottom" within backlog ──────────────────────────
  const handleMoveToTop = (todo: Todo) => {
    if (!allTodos) return;
    const currentIndex = allTodos.findIndex((t) => t.id === todo.id);
    if (currentIndex <= 0) return;
    moveTodo.mutate(
      { todoId: todo.id, body: { position: 0 }, overId: allTodos[0].id },
      { onError: (err) => showMoveError(getErrorMessage(err)) },
    );
  };

  const handleMoveToBottom = (todo: Todo) => {
    if (!allTodos) return;
    const currentIndex = allTodos.findIndex((t) => t.id === todo.id);
    const lastIndex = allTodos.length - 1;
    if (currentIndex >= lastIndex) return;
    moveTodo.mutate(
      { todoId: todo.id, body: { position: lastIndex - 1 }, overId: allTodos[lastIndex].id },
      { onError: (err) => showMoveError(getErrorMessage(err)) },
    );
  };

  // ── Sprint-section keyboard move to top/bottom ────────────────────────────
  const handleSprintMoveToTop = (todo: Todo) => {
    moveTodo.mutate(
      { todoId: todo.id, body: { position: 0 } },
      { onError: (err) => showMoveError(getErrorMessage(err)) },
    );
  };

  const handleSprintMoveToBottom = (todo: Todo) => {
    moveTodo.mutate(
      { todoId: todo.id, body: { position: 9999 } },
      { onError: (err) => showMoveError(getErrorMessage(err)) },
    );
  };

  // ── Menu-based move (BL-7) ────────────────────────────────────────────────
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

  // ── Deletion ──────────────────────────────────────────────────────────────
  const handleConfirmDelete = () => {
    if (!deletingTodo) return;
    const todoToDelete = deletingTodo;
    if (selectedTodo?.id === todoToDelete.id) setSelectedTodo(null);
    deleteTodo.mutate(todoToDelete.id, {
      onSuccess: () => setDeletingTodo(null),
    });
  };

  // ── Backlog droppable zone (useDroppable called at component level) ───────
  const { setNodeRef: setBacklogDropRef, isOver: isOverBacklog } = useDroppable({
    id: BACKLOG_LIST_ID,
    data: { sprintId: null },
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-5">
        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {project?.name ?? 'Project'}
            </p>
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Backlog</h1>
              {!isLoading && !isError && (
                <span className="text-sm text-slate-500">
                  {stats.total} {stats.total === 1 ? 'item' : 'items'}
                  {stats.points > 0 && ` · ${stats.points} pts`}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setSprintDialog({ open: true, sprint: null })}
            >
              <SprintsIcon className="h-4 w-4" />
              Create sprint
            </Button>
            <Button onClick={() => setSelectedTodo({ id: '' } as Todo)}>
              <PlusIcon className="h-4 w-4" />
              Create todo
            </Button>
          </div>
        </div>

        {/* ── Move/action error banner ──────────────────────────────────── */}
        {moveError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertTriangleIcon className="h-4 w-4 shrink-0 text-red-500" />
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

        {/* ── Sprint loading / error states ────────────────────────────── */}
        {sprintsLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Spinner className="h-4 w-4 text-[#2f4bff]" />
            Loading sprints…
          </div>
        )}

        {/* ── Planned sprint sections (ABOVE the backlog) ───────────────── */}
        {!sprintsLoading && plannedSprints.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
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
                onTodoOpen={setSelectedTodo}
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

        {/* ── Backlog loading ───────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16">
            <Spinner className="h-6 w-6 text-[#2f4bff]" />
            <span className="text-sm text-slate-500">Loading backlog…</span>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
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

        {/* ── Stats bar ─────────────────────────────────────────────────── */}
        {!isLoading && !isError && stats.total > 0 && (
          <StatsBar stats={stats} />
        )}

        {/* ── Filter toolbar ────────────────────────────────────────────── */}
        {!isLoading && !isError && (
          <FilterToolbar
            search={search}
            priorityFilter={priorityFilter}
            typeFilter={typeFilter}
            hasFilters={hasFilters}
            onSearch={setSearch}
            onPriority={setPriorityFilter}
            onType={setTypeFilter}
            onClear={clearFilters}
          />
        )}

        {/* ── Filter-active notice ──────────────────────────────────────── */}
        {!isLoading && !isError && hasFilters && filteredTodos.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <InfoIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Drag-and-drop reordering is disabled while filters are active.</span>
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-[#2f4bff] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── Main backlog content ──────────────────────────────────────── */}
        {!isLoading && !isError && (
          <>
            {/* Empty backlog */}
            {stats.total === 0 && (
              <EmptyState
                icon={<BacklogIcon className="h-7 w-7" />}
                title="Your backlog is empty"
                description="Add todos to your backlog to start planning your work."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => setSelectedTodo({ id: '' } as Todo)}>
                      <PlusIcon className="h-4 w-4" />
                      Create todo
                    </Button>
                    <Button variant="secondary">
                      <SparklesIcon className="h-4 w-4" />
                      Generate with AI
                    </Button>
                  </div>
                }
              />
            )}

            {/* No filter results */}
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

            {/* Backlog todo list */}
            {filteredTodos.length > 0 && (
              <SortableContext
                id={BACKLOG_LIST_ID}
                items={filteredTodos.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  ref={setBacklogDropRef}
                  className={cn(
                    'rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2 min-h-[3rem] transition-colors',
                    isOverBacklog && 'bg-[#eef1ff]/60 border-[#2f4bff]/30',
                  )}
                  role="list"
                  aria-label="Backlog todos"
                >
                  {filteredTodos.map((todo) => (
                    <div key={todo.id} role="listitem">
                      <TodoRow
                        todo={todo}
                        onOpen={setSelectedTodo}
                        onDelete={setDeletingTodo}
                        onMoveToTop={handleMoveToTop}
                        onMoveToBottom={handleMoveToBottom}
                        sprints={eligibleSprints}
                        onMoveTo={(t, sprintId) => handleMoveTo(t, sprintId, null)}
                        sortingDisabled={hasFilters}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            )}

            {/* Quick create */}
            {projectId && <QuickCreate projectId={projectId} />}
          </>
        )}

        {/* ── Details dialog ────────────────────────────────────────────── */}
        {selectedTodo && projectId && (
          <TodoDetailsDialog
            todo={selectedTodo.id ? selectedTodo : null}
            projectId={projectId}
            onClose={() => setSelectedTodo(null)}
            onDelete={(todo) => {
              setSelectedTodo(null);
              setDeletingTodo(todo);
            }}
          />
        )}

        {/* ── Delete confirmation ───────────────────────────────────────── */}
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
                <span className="font-semibold text-slate-900">
                  {deletingTodo.key}: {deletingTodo.title}
                </span>
                ?
              </p>
              <p className="mt-1.5 text-slate-500">This action cannot be undone.</p>
              {deleteTodo.isError && (
                <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                  {getErrorMessage(deleteTodo.error)}
                </p>
              )}
            </>
          )}
        </ConfirmDialog>

        {/* ── Sprint form dialog (create / edit) ────────────────────────── */}
        {projectId && (
          <SprintFormDialog
            open={sprintDialog.open}
            onClose={() => setSprintDialog({ open: false, sprint: null })}
            projectId={projectId}
            sprint={sprintDialog.sprint}
          />
        )}

        {/* ── Start sprint dialog (SPR-3) ───────────────────────────────── */}
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
              // Silence TS — started is the Sprint returned; we navigate to the board.
              void started;
            }}
          />
        )}
      </div>

      {/* ── DragOverlay — ghosted copy of dragged todo ────────────────────── */}
      <DragOverlay>
        {activeTodo ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#2f4bff]/30 bg-[#eef1ff] px-3 py-2.5 shadow-xl opacity-90 pointer-events-none">
            <span className="font-mono text-[11px] font-medium text-slate-400">
              {activeTodo.key}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
              {activeTodo.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ─── Stats Bar ───────────────────────────────────────────────────────────────

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

function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Priority
        </span>
        <div className="flex items-center gap-1.5">
          {(TODO_PRIORITIES as readonly TodoPriority[]).map((p) => {
            const count = stats.byPriority[p];
            if (!count) return null;
            return (
              <span key={p} className="flex items-center gap-1">
                <PriorityBadge priority={p} iconOnly />
                <span>{count}</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Type
        </span>
        <div className="flex items-center gap-2">
          {(TODO_TYPES as readonly TodoType[]).map((t) => {
            const count = stats.byType[t];
            if (!count) return null;
            return (
              <span key={t}>
                <span className="font-medium">{count}</span> {TYPE_LABELS[t]}
              </span>
            );
          })}
        </div>
      </div>

      {stats.total > 0 && (
        <div className="ml-auto text-slate-400">
          {stats.estimated}/{stats.total} estimated
          {stats.points > 0 && ` · ${stats.points} pts total`}
        </div>
      )}
    </div>
  );
}

// ─── Filter Toolbar ──────────────────────────────────────────────────────────

interface FilterToolbarProps {
  search: string;
  priorityFilter: TodoPriority | '';
  typeFilter: TodoType | '';
  hasFilters: boolean;
  onSearch: (v: string) => void;
  onPriority: (v: TodoPriority | '') => void;
  onType: (v: TodoType | '') => void;
  onClear: () => void;
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

function FilterToolbar({
  search,
  priorityFilter,
  typeFilter,
  hasFilters,
  onSearch,
  onPriority,
  onType,
  onClear,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          placeholder="Search by key, title, description or label…"
          aria-label="Search todos"
          onChange={(e) => onSearch(e.target.value)}
          className={cn(
            'h-10 w-full min-w-[10rem] rounded-lg border bg-white pl-9 pr-3 text-sm',
            'placeholder:text-slate-400 focus:outline-none focus:ring-2',
            'border-slate-300 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20',
          )}
        />
      </div>

      <div className="relative">
        <FilterIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <select
          value={priorityFilter}
          aria-label="Filter by priority"
          onChange={(e) => onPriority(e.target.value as TodoPriority | '')}
          className={cn(
            'h-10 appearance-none rounded-lg border bg-white py-0 pl-8 pr-7 text-sm',
            'focus:outline-none focus:ring-2 cursor-pointer',
            priorityFilter
              ? 'border-[#2f4bff] text-[#2f4bff] ring-1 ring-[#2f4bff]/30'
              : 'border-slate-300 text-slate-600 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20',
          )}
        >
          <option value="">Priority</option>
          {(TODO_PRIORITIES as readonly TodoPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      </div>

      <div className="relative">
        <FilterIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <select
          value={typeFilter}
          aria-label="Filter by type"
          onChange={(e) => onType(e.target.value as TodoType | '')}
          className={cn(
            'h-10 appearance-none rounded-lg border bg-white py-0 pl-8 pr-7 text-sm',
            'focus:outline-none focus:ring-2 cursor-pointer',
            typeFilter
              ? 'border-[#2f4bff] text-[#2f4bff] ring-1 ring-[#2f4bff]/30'
              : 'border-slate-300 text-slate-600 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20',
          )}
        >
          <option value="">Type</option>
          {(TODO_TYPES as readonly TodoType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS_SINGULAR[t]}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
        >
          <XIcon className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
