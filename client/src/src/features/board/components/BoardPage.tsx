import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
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
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  Sprint,
  Todo,
  TodoPriority,
  TodoStatus,
  TodoType,
  UpdateTodoRequest,
} from '../../../types/api';
import { TODO_PRIORITIES, TODO_STATUSES, TODO_TYPES } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import {
  AlertTriangleIcon,
  BacklogIcon,
  BoardIcon,
  CalendarIcon,
  CheckCircleIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  XIcon,
} from '../../../shared/components/icons';
import { TypeIcon } from '../../../shared/components/TypeIcon';
import { PriorityBadge } from '../../../shared/components/PriorityBadge';
import { STATUS_LABELS, STATUS_TONES } from '../../../shared/components/StatusBadge';
import { PointsBadge } from '../../../shared/components/PointsSelect';
import { LabelChip, TodoDueDate } from '../../../shared/components/TodoIndicators';
import { useProject } from '../../projects/hooks/useProjects';
import { useSprints } from '../../backlog/hooks/useSprints';
import { useCreateTodo, useDeleteTodo, useUpdateTodo } from '../../backlog/hooks/useTodoMutations';
import { useSprintBoard, useMoveBoardTodo } from '../../sprints/hooks/useSprintMutations';
import { useGenerateSprintSummary } from '../../sprints/hooks/useSprintMutations';
import { getErrorMessage } from '../../../lib/api-error';
import ReactMarkdown from 'react-markdown';
import { TodoDetailsDialog } from '../../backlog/components/TodoDetailsDialog';
import { InlineTodoFields } from '../../../shared/components/InlineTodoFields';
import { CompleteSprintDialog } from '../../sprints/components/CompleteSprintDialog';
import {
  daysRemaining,
  donePointsPercent,
  doneTodosPercent,
  formatSprintDate,
  isSprintOverdue,
} from '../../sprints/lib/sprintUtils';

const COLUMN_CLASS: Record<TodoStatus, string> = {
  todo: 'kb-col-todo',
  in_progress: 'kb-col-progress',
  in_review: 'kb-col-review',
  done: 'kb-col-done',
};

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const TYPE_LABELS: Record<TodoType, string> = {
  task: 'Task',
  story: 'Story',
  bug: 'Bug',
};

/**
 * SPR-4 + SPR-5: Active sprint board.
 * Real drag-and-drop via dnd-kit with API persistence and optimistic updates.
 */
export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);
  const {
    data: allSprints,
    isLoading: sprintsLoading,
    isError: sprintsError,
    error: sprintsErr,
    refetch: refetchSprints,
  } = useSprints(projectId);

  const activeSprints = (allSprints ?? []).filter((s) => s.status === 'active');
  const activeSprint = activeSprints.length === 1 ? activeSprints[0] : undefined;
  const plannedSprints = (allSprints ?? []).filter((s) => s.status === 'planned');

  const {
    data: boardData,
    isLoading: boardLoading,
    isError: boardError,
    error: boardErr,
    refetch,
  } = useSprintBoard(activeSprint?.id);

  const moveBoardTodo = useMoveBoardTodo(projectId ?? '', activeSprint?.id ?? '');
  const generateSummary = useGenerateSprintSummary(projectId ?? '');

  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const deleteTodo = useDeleteTodo(projectId ?? '');
  const updateTodo = useUpdateTodo(projectId ?? '');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const moveErrorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMoveError = (msg: string) => {
    setMoveError(msg);
    if (moveErrorRef.current) clearTimeout(moveErrorRef.current);
    moveErrorRef.current = setTimeout(() => setMoveError(null), 5000);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const todoId = String(active.id);
    const overId = String(over.id);

    const sourceStatus: TodoStatus =
      (active.data.current?.sortable?.containerId as TodoStatus) ?? 'todo';
    const destStatus: TodoStatus =
      (over.data.current?.sortable?.containerId as TodoStatus) ??
      (over.data.current?.columnStatus as TodoStatus) ??
      sourceStatus;

    if (active.id === over.id) return;

    const destColumn = boardData?.columns[destStatus] ?? [];

    let position: number;
    if (sourceStatus === destStatus) {
      const overIndex = destColumn.findIndex((t) => t.id === overId);
      position = overIndex;
    } else {
      const overIndex = destColumn.findIndex((t) => t.id === overId);
      position = overIndex >= 0 ? overIndex : destColumn.length;
    }

    moveBoardTodo.mutate(
      { todoId, body: { status: destStatus, position } },
      { onError: (err) => showMoveError(getErrorMessage(err)) },
    );
  };

  // Board-only view state (client-side filtering; never touches the stored order).
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | ''>('');
  const [typeFilter, setTypeFilter] = useState<TodoType | ''>('');
  const [labelFilter, setLabelFilter] = useState('');
  const [composerStatus, setComposerStatus] = useState<TodoStatus | null>(null);
  const createTodo = useCreateTodo(projectId ?? '');
  const hasFilters = Boolean(search.trim() || priorityFilter || typeFilter || labelFilter);

  const allLabels = useMemo(
    () =>
      [
        ...new Set(
          (TODO_STATUSES as readonly TodoStatus[]).flatMap((status) =>
            (boardData?.columns[status] ?? []).flatMap((todo) => todo.labels),
          ),
        ),
      ].sort(),
    [boardData],
  );

  const visibleByStatus = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = {} as Record<TodoStatus, Todo[]>;
    for (const status of TODO_STATUSES as readonly TodoStatus[]) {
      result[status] = (boardData?.columns[status] ?? []).filter((t) => {
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
    }
    return result;
  }, [boardData, search, priorityFilter, typeFilter, labelFilter]);

  const clearFilters = () => {
    setSearch('');
    setPriorityFilter('');
    setTypeFilter('');
    setLabelFilter('');
  };

  const handleCreate = async (status: TodoStatus, title: string) => {
    if (!activeSprint) return;
    await createTodo.mutateAsync({
      title,
      status,
      sprintId: activeSprint.id,
      type: 'task',
      priority: 'medium',
      storyPoints: null,
    });
  };


  const activeTodo = activeDragId
    ? Object.values(boardData?.columns ?? {}).flat().find((t) => t.id === activeDragId)
    : null;

  if (sprintsError) {
    return (
      <EmptyState
        tone="error"
        icon={<AlertTriangleIcon className="h-7 w-7" />}
        title="Couldn't load sprints"
        description={getErrorMessage(sprintsErr)}
        action={
          <Button variant="secondary" onClick={() => refetchSprints()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!sprintsLoading && activeSprints.length > 1) {
    return (
      <EmptyState
        tone="error"
        icon={<AlertTriangleIcon className="h-7 w-7" />}
        title="Multiple active sprints detected"
        description={`This project has ${activeSprints.length} active sprints. Sprint data has not been changed. Resolve this inconsistency before using the board.`}
        action={
          <Button variant="secondary" onClick={() => refetchSprints()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!sprintsLoading && !activeSprint) {
    return (
      <EmptyState
        illustration
        icon={<BoardIcon className="h-7 w-7" />}
        title="No active sprint"
        description="Start a sprint from your backlog and its tasks will show up here, ready to move across the board."
        action={
          <Link
            to={`/projects/${projectId}/backlog`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[color:var(--kb-primary)] px-5 text-sm font-semibold text-[color:var(--kb-on-primary)] shadow-sm transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kb-bg)]"
          >
            <BacklogIcon className="h-4 w-4" />
            Go to backlog
          </Link>
        }
      />
    );
  }

  const isLoading = sprintsLoading || boardLoading;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-medium text-[color:var(--kb-muted)]">
            <span className="truncate">{project?.name ?? 'Project'}</span>
            {project?.key && <span className="kb-pill kb-tone-lav font-mono">{project.key}</span>}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-[color:var(--kb-text)]">
              {activeSprint?.name ?? 'Board'}
            </h1>
            {activeSprint && (
              <span className="kb-pill kb-tone-sage">
                <span aria-hidden="true" className="kb-dot-sage h-1.5 w-1.5 rounded-full" />
                Active
              </span>
            )}
          </div>
          {activeSprint?.goal && (
            <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-[color:var(--kb-muted)]">
              {activeSprint.goal}
            </p>
          )}
        </div>
        {activeSprint && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setCompleteOpen(true)}>
              <CheckCircleIcon className="h-4 w-4" />
              Complete sprint
            </Button>
            <Button onClick={() => setComposerStatus('todo')}>
              <PlusIcon className="h-4 w-4" />
              Add task
            </Button>
          </div>
        )}
      </header>

      {/* Move error */}
      {moveError && (
        <div role="alert" className="kb-notice kb-tone-rose">
          <AlertTriangleIcon className="h-4 w-4 shrink-0" />
          <span>{moveError}</span>
          <button
            type="button"
            onClick={() => setMoveError(null)}
            aria-label="Dismiss"
            className="ml-auto rounded-full p-1 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)] dark:hover:bg-white/10"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sprint progress */}
      {activeSprint && <SprintHeader sprint={activeSprint} />}

      {/* AI summary section */}
      {activeSprint && (
        <BoardSummarySection
          sprint={activeSprint}
          projectId={projectId ?? ''}
          onGenerate={() => generateSummary.mutate(activeSprint.id)}
          isGenerating={generateSummary.isPending}
          generateError={generateSummary.isError ? getErrorMessage(generateSummary.error) : null}
        />
      )}

      {/* Search + filters */}
      {!isLoading && !boardError && boardData && (
        <BoardToolbar
          search={search}
          priorityFilter={priorityFilter}
          typeFilter={typeFilter}
          labelFilter={labelFilter}
          labels={allLabels}
          hasFilters={hasFilters}
          onSearch={setSearch}
          onPriority={setPriorityFilter}
          onType={setTypeFilter}
          onLabel={setLabelFilter}
          onClear={clearFilters}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="kb-card flex items-center justify-center gap-3 rounded-[1.75rem] py-20">
          <Spinner className="h-6 w-6 text-[color:var(--kb-primary)]" />
          <span className="text-sm text-[color:var(--kb-muted)]">Loading board...</span>
        </div>
      )}

      {/* Board error */}
      {boardError && (
        <EmptyState
          tone="error"
          icon={<AlertTriangleIcon className="h-7 w-7" />}
          title="Couldn't load the board"
          description={getErrorMessage(boardErr)}
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {/* Kanban board */}
      {!isLoading && !boardError && boardData && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Columns keep a fixed, readable width; smaller viewports scroll horizontally. */}
          <div className="kanbot-scroll -mx-1 snap-x snap-proximity overflow-x-auto overscroll-x-contain px-1 pb-4">
            <div className="flex w-max items-stretch gap-4">
              {(TODO_STATUSES as readonly TodoStatus[]).map((status) => (
                <BoardColumn
                  key={status}
                  status={status}
                  todos={visibleByStatus[status]}
                  totalCount={(boardData.columns[status] ?? []).length}
                  filtered={hasFilters}
                  composerOpen={composerStatus === status}
                  onComposerChange={(open) => setComposerStatus(open ? status : null)}
                  onCreate={handleCreate}
                  onCardClick={setSelectedTodo}
                  onInlineUpdate={(todo, changes) =>
                    updateTodo.mutate(
                      { todoId: todo.id, body: changes },
                      { onError: (err) => showMoveError(getErrorMessage(err)) },
                    )
                  }
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeTodo ? (
              <div className="kb-card pointer-events-none rotate-2 rounded-[1.25rem] p-4 kb-shadow-lg ring-2 ring-[color:var(--kb-primary)]">
                <div className="flex items-center gap-2">
                  <TypeIcon type={activeTodo.type} size="h-4 w-4" className="shrink-0" />
                  <span className="font-mono text-[11px] text-[color:var(--kb-muted)]">
                    {activeTodo.key}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-[color:var(--kb-text)]">
                  {activeTodo.title}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Todo details dialog */}
      {selectedTodo && projectId && (
        <TodoDetailsDialog
          todo={selectedTodo}
          projectId={projectId}
          onClose={() => setSelectedTodo(null)}
          onDelete={(todo) => {
            setSelectedTodo(null);
            setDeletingTodo(todo);
          }}
        />
      )}

      <ConfirmDialog
        open={deletingTodo !== null}
        onClose={() => setDeletingTodo(null)}
        onConfirm={() => {
          if (!deletingTodo) return;
          deleteTodo.mutate(deletingTodo.id, {
            onSuccess: () => setDeletingTodo(null),
          });
        }}
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

      {/* Complete sprint dialog */}
      {activeSprint && projectId && (
        <CompleteSprintDialog
          open={completeOpen}
          onClose={() => setCompleteOpen(false)}
          sprint={activeSprint}
          projectId={projectId}
          plannedSprints={plannedSprints}
          onCompleted={(completed) => {
            setCompleteOpen(false);
            navigate(`/projects/${projectId}/sprints`);
            void completed;
          }}
        />
      )}
    </div>
  );
}

// ─── Toolbar ───────────────────────────────────────────────────────────────

function BoardToolbar({
  search,
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
}: {
  search: string;
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
}) {
  const selectClass = 'kb-input kb-select';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-56 sm:max-w-sm">
        <SearchIcon className="kb-muted pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          placeholder="Search this board"
          aria-label="Search this board"
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
            {TYPE_LABELS[t]}
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
    </div>
  );
}

// ─── Sprint Header ─────────────────────────────────────────────────────────

function SprintHeader({ sprint }: { sprint: Sprint }) {
  const stats = sprint.stats;
  const ptsPercent = donePointsPercent(stats);
  const todosPercent = doneTodosPercent(stats);
  const remaining = daysRemaining(sprint.endDate);
  const overdue = isSprintOverdue(sprint);

  const startLabel = formatSprintDate(sprint.startDate);
  const endLabel = formatSprintDate(sprint.endDate);

  const percent = stats.totalPoints > 0 ? ptsPercent : todosPercent;

  return (
    <div className="kb-card flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[1.75rem] px-6 py-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
        {startLabel && endLabel && (
          <span className="kb-pill kb-tone-neutral gap-1.5 px-2.5 py-1 text-xs">
            <CalendarIcon className="h-3 w-3" aria-hidden="true" />
            {startLabel} – {endLabel}
          </span>
        )}
        {remaining !== null && (
          <span
            className={cn(
              'kb-pill px-2.5 py-1 text-xs',
              overdue ? 'kb-tone-rose' : 'kb-tone-sky',
            )}
          >
            {overdue
              ? 'Overdue'
              : remaining === 0
                ? 'Last day'
                : `${remaining} day${remaining === 1 ? '' : 's'} left`}
          </span>
        )}
      </div>

      <div className="flex min-w-[12rem] flex-1 basis-56 items-center gap-3">
        <div
          aria-label="Sprint progress"
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-[color:var(--kb-soft)]"
        >
          <div
            className="kb-dot-sage h-full rounded-full transition-[width] duration-500"
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className="w-10 text-right text-sm font-semibold text-[color:var(--kb-text)]">
          {percent}%
        </span>
      </div>

      <dl className="flex items-center gap-6">
        <div>
          <dt className="text-xs text-[color:var(--kb-muted)]">Done</dt>
          <dd className="text-lg font-semibold leading-tight text-[color:var(--kb-text)]">
            {stats.doneTodos}
            <span className="text-sm font-normal text-[color:var(--kb-muted)]">/{stats.totalTodos}</span>
          </dd>
        </div>
        {stats.totalPoints > 0 && (
          <div>
            <dt className="text-xs text-[color:var(--kb-muted)]">Points</dt>
            <dd className="text-lg font-semibold leading-tight text-[color:var(--kb-text)]">
              {stats.donePoints}
              <span className="text-sm font-normal text-[color:var(--kb-muted)]">/{stats.totalPoints}</span>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

// ─── Board Column ────────────────────────────────────────────────────────────

function BoardColumn({
  status,
  todos,
  totalCount,
  filtered,
  composerOpen,
  onComposerChange,
  onCreate,
  onCardClick,
  onInlineUpdate,
}: {
  status: TodoStatus;
  todos: Todo[];
  totalCount: number;
  filtered: boolean;
  composerOpen: boolean;
  onComposerChange: (open: boolean) => void;
  onCreate: (status: TodoStatus, title: string) => Promise<void>;
  onCardClick: (todo: Todo) => void;
  onInlineUpdate: (todo: Todo, changes: UpdateTodoRequest) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { columnStatus: status },
  });

  const tone = STATUS_TONES[status];

  return (
    <section
      aria-label={STATUS_LABELS[status]}
      className={cn(
        'flex w-[18.5rem] shrink-0 snap-start flex-col rounded-[1.75rem] p-3',
        COLUMN_CLASS[status],
      )}
    >
      <div className="flex items-center justify-between px-1.5 pb-3 pt-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--kb-text)]">
          <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full', `kb-dot-${tone}`)} />
          {STATUS_LABELS[status]}
          <span className={cn('kb-pill', `kb-tone-${tone}`)}>
            {filtered ? `${todos.length} of ${totalCount}` : totalCount}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => onComposerChange(true)}
          aria-label={`Add task to ${STATUS_LABELS[status]}`}
          className="kb-icon-btn h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      <SortableContext
        id={status}
        items={todos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-[8rem] flex-1 flex-col gap-3 rounded-[1.25rem] p-1 transition-colors',
            isOver && 'kb-drop-over',
          )}
        >
          {todos.map((todo) => (
            <BoardCard
              key={todo.id}
              todo={todo}
              onOpen={onCardClick}
              onInlineUpdate={onInlineUpdate}
            />
          ))}
          {todos.length === 0 && (
            <div className="rounded-[1.25rem] border-2 border-dashed border-[color:var(--kb-line)] px-3 py-8 text-center">
              <p className="text-sm font-medium text-[color:var(--kb-text)]">
                {filtered && totalCount > 0 ? 'No matches' : 'Nothing here yet'}
              </p>
              <p className="mt-0.5 text-xs text-[color:var(--kb-muted)]">
                {filtered && totalCount > 0
                  ? 'Adjust the filters to see tasks.'
                  : 'Drop a card here or add a task.'}
              </p>
            </div>
          )}
        </div>
      </SortableContext>

      <ColumnComposer
        status={status}
        open={composerOpen}
        onOpenChange={onComposerChange}
        onCreate={onCreate}
      />
    </section>
  );
}

// ─── Column composer (inline "add task") ─────────────────────────────────────

function ColumnComposer({
  status,
  open,
  onOpenChange,
  onCreate,
}: {
  status: TodoStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (status: TodoStatus, title: string) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const close = () => {
    setValue('');
    setError(null);
    onOpenChange(false);
  };

  const submit = async () => {
    const title = value.trim();
    if (!title) {
      setError('Title cannot be empty.');
      return;
    }
    if (title.length > 200) {
      setError('Title must be 200 characters or fewer.');
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      await onCreate(status, title);
      setValue('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="mt-2 flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium text-[color:var(--kb-muted)] transition-colors hover:bg-[color:var(--kb-surface)] hover:text-[color:var(--kb-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
      >
        <PlusIcon className="h-4 w-4" />
        Add task
      </button>
    );
  }

  return (
    <div className="kb-card mt-2 rounded-[1.25rem] p-3">
      <textarea
        autoFocus
        rows={2}
        maxLength={200}
        value={value}
        disabled={pending}
        aria-label={`New task title for ${STATUS_LABELS[status]}`}
        placeholder="What needs doing?"
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
          if (e.key === 'Escape') close();
        }}
        className="w-full resize-none bg-transparent text-sm text-[color:var(--kb-text)] placeholder:text-[color:var(--kb-muted)] focus:outline-none disabled:opacity-50"
      />
      {error && (
        <p role="alert" className="mb-2 text-xs font-medium text-[color:var(--kb-rose-fg)]">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={close} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => void submit()} loading={pending} loadingText="Adding...">
          Add task
        </Button>
      </div>
    </div>
  );
}

// ─── Board Card ──────────────────────────────────────────────────────────────

function BoardCard({
  todo,
  onOpen,
  onInlineUpdate,
}: {
  todo: Todo;
  onOpen: (todo: Todo) => void;
  onInlineUpdate: (todo: Todo, changes: UpdateTodoRequest) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'kb-card kb-lift group relative cursor-pointer rounded-[1.25rem] p-4',
        isDragging && 'opacity-40 ring-2 ring-[color:var(--kb-primary)]',
      )}
      aria-label={`Open ${todo.key}: ${todo.title}`}
      onClick={() => onOpen(todo)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(todo);
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-[color:var(--kb-muted)]">
          <TypeIcon type={todo.type} size="h-3.5 w-3.5" className="shrink-0" />
          <span className="truncate">{todo.key}</span>
        </span>
        <PointsBadge points={todo.storyPoints} />
      </div>

      <p className="mt-2 text-[15px] font-semibold leading-snug text-[color:var(--kb-text)]">
        {todo.title}
      </p>
      {todo.description.trim() && (
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[color:var(--kb-muted)]">
          {todo.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={todo.priority} />
        {todo.labels.slice(0, 2).map((label) => (
          <LabelChip key={label} label={label} />
        ))}
        {todo.labels.length > 2 && (
          <span className="text-[11px] text-[color:var(--kb-muted)]">+{todo.labels.length - 2}</span>
        )}
      </div>

      <div className="relative mt-3 flex items-center justify-between gap-2">
        <TodoDueDate dueDate={todo.dueDate} />
        <div className="kb-reveal ml-auto">
          <InlineTodoFields todo={todo} onSave={onInlineUpdate} />
        </div>
      </div>
    </div>
  );
}

// ─── Board AI Summary Section ─────────────────────────────────────────────────

function BoardSummarySection({
  sprint,
  isGenerating,
  generateError,
  onGenerate,
}: {
  sprint: Sprint;
  projectId: string;
  isGenerating: boolean;
  generateError: string | null;
  onGenerate: () => void;
}) {
  if (!sprint.summary && !isGenerating && !generateError) {
    return (
      <div className="kb-tone-lav flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4" />
          <span className="text-sm font-semibold">Sprint summary</span>
        </div>
        <Button variant="secondary" size="sm" onClick={onGenerate} disabled={isGenerating}>
          <SparklesIcon className="h-3.5 w-3.5" />
          Summarize sprint
        </Button>
      </div>
    );
  }

  return (
    <div className="kb-card space-y-3 rounded-[1.75rem] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="kb-tone-lav inline-flex h-7 w-7 items-center justify-center rounded-full">
            <SparklesIcon className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold text-[color:var(--kb-text)]">Sprint summary</span>
          {sprint.summary && (
            <span className="text-xs text-[color:var(--kb-muted)]">
              Generated {new Date(sprint.summary.generatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerate}
          loading={isGenerating}
          loadingText="Generating..."
        >
          {sprint.summary ? 'Regenerate' : 'Generate'}
        </Button>
      </div>

      {generateError && (
        <p className="text-xs text-[color:var(--kb-rose-fg)]">{generateError}</p>
      )}

      {isGenerating && (
        <div className="flex items-center gap-2 text-xs text-[color:var(--kb-muted)]">
          <Spinner className="h-4 w-4 text-[color:var(--kb-primary)]" />
          Generating summary...
        </div>
      )}

      {sprint.summary && !isGenerating && (
        <div className="prose prose-sm max-w-none text-[color:var(--kb-text)] dark:prose-invert">
          <ReactMarkdown>{sprint.summary.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
