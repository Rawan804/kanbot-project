import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
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
  TodoStatus,
  UpdateTodoRequest,
} from '../../../types/api';
import { TODO_STATUSES } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { Button } from '../../../shared/components/Button';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import {
  AlertTriangleIcon,
  BacklogIcon,
  BoardIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  PlusIcon,
  SparklesIcon,
} from '../../../shared/components/icons';
import { TypeIcon } from '../../../shared/components/TypeIcon';
import { PriorityBadge } from '../../../shared/components/PriorityBadge';
import { PointsBadge } from '../../../shared/components/PointsSelect';
import { LabelChip, TodoDueDate } from '../../../shared/components/TodoIndicators';
import { useSprints } from '../../backlog/hooks/useSprints';
import {
  useCreateTodo,
  useDeleteTodo,
  useUpdateTodo,
} from '../../backlog/hooks/useTodoMutations';
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

const COLUMN_LABELS: Record<TodoStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const COLUMN_STYLES: Record<TodoStatus, { indicator: string }> = {
  todo: {
    indicator: 'bg-blue-600 dark:bg-blue-400',
  },
  in_progress: {
    indicator: 'bg-orange-500 dark:bg-orange-400',
  },
  in_review: {
    indicator: 'bg-pink-500 dark:bg-pink-300',
  },
  done: {
    indicator: 'bg-green-600 dark:bg-green-400',
  },
};


export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
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
  const createTodo = useCreateTodo(projectId ?? '');
  const updateTodo = useUpdateTodo(projectId ?? '');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [composerStatus, setComposerStatus] = useState<TodoStatus | null>(null);
  const moveErrorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMoveError = (msg: string) => {
    setMoveError(msg);
    if (moveErrorRef.current) clearTimeout(moveErrorRef.current);
    moveErrorRef.current = setTimeout(() => setMoveError(null), 5000);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
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

  const activeTodo = activeDragId
    ? Object.values(boardData?.columns ?? {}).flat().find((t) => t.id === activeDragId)
    : null;

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
        icon={<BoardIcon className="h-7 w-7" />}
        title="No active sprint"
        description="Start a sprint from your backlog to begin tracking work here."
        action={
          <Link
            to={`/projects/${projectId}/backlog`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-kanbot-primary px-4 text-sm font-semibold text-white hover:bg-kanbot-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary"
          >
            <BacklogIcon className="h-4 w-4" />
            Go to Backlog
          </Link>
        }
      />
    );
  }

  const isLoading = sprintsLoading || boardLoading;

  return (
    <div className="board-page flex flex-col gap-5">
      <PageHeader
        title={activeSprint?.name ?? 'Board'}
        description={
          activeSprint?.goal ||
          'Move tasks through To Do, In Progress, In Review, and Done.'
        }
        actions={
          activeSprint ? (
            <>
            <Button variant="secondary" onClick={() => setCompleteOpen(true)}>
              <CheckCircleIcon className="h-4 w-4" />
              Complete sprint
            </Button>
            <Button onClick={() => setComposerStatus('todo')}>
              <PlusIcon className="h-4 w-4" />
              Create task
            </Button>
            </>
          ) : undefined
        }
      />

      {/* Move error */}
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
            aria-label="Dismiss"
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Sprint header details */}
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-kanbot-border bg-kanbot-surface py-20 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface">
          <Spinner className="h-6 w-6 text-kanbot-primary" />
          <span className="text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
            Loading board...
          </span>
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
          {/* Keep status columns wide and consistent; smaller viewports scroll horizontally. */}
          <div className="kanbot-scroll overflow-x-auto overscroll-x-contain pb-3">
            <div className="flex w-max items-start gap-4">
              {(TODO_STATUSES as readonly TodoStatus[]).map((status) => (
                <BoardColumn
                  key={status}
                  status={status}
                  todos={boardData.columns[status] ?? []}
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
              <div
                className="board-task-card pointer-events-none rounded-xl px-3 py-3 opacity-90 shadow-2xl"
              >
                <div className="flex items-start gap-2">
                  <TypeIcon type={activeTodo.type} size="h-4 w-4" className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] text-kanbot-muted dark:text-kanbot-dark-muted">
                      {activeTodo.key}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text line-clamp-2">
                      {activeTodo.title}
                    </p>
                  </div>
                </div>
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
    <div className="kb-card overflow-hidden rounded-3xl">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
        <div className="min-w-0 flex-1 basis-64">
          {sprint.goal && (
            <p className="line-clamp-2 text-sm text-kanbot-text dark:text-kanbot-dark-text">
              {sprint.goal}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {startLabel && endLabel && (
              <span className="inline-flex items-center rounded-md bg-kanbot-background px-2 py-1 font-medium text-kanbot-muted dark:bg-kanbot-dark-background dark:text-kanbot-dark-muted">
                {startLabel} – {endLabel}
              </span>
            )}
            {remaining !== null && (
              <span
                className={cn(
                  'inline-flex items-center rounded-md px-2 py-1 font-semibold',
                  overdue
                    ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
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
        </div>

        <dl className="flex items-center gap-7">
          <div>
            <dt className="text-xs text-kanbot-muted dark:text-kanbot-dark-muted">Done</dt>
            <dd className="text-xl font-semibold leading-tight text-kanbot-text dark:text-kanbot-dark-text">
              {stats.doneTodos}
              <span className="text-sm font-normal text-kanbot-muted dark:text-kanbot-dark-muted">
                /{stats.totalTodos}
              </span>
            </dd>
          </div>
          {stats.totalPoints > 0 && (
            <div>
              <dt className="text-xs text-kanbot-muted dark:text-kanbot-dark-muted">Points</dt>
              <dd className="text-xl font-semibold leading-tight text-kanbot-text dark:text-kanbot-dark-text">
                {stats.donePoints}
                <span className="text-sm font-normal text-kanbot-muted dark:text-kanbot-dark-muted">
                  /{stats.totalPoints}
                </span>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-kanbot-muted dark:text-kanbot-dark-muted">Complete</dt>
            <dd className="text-xl font-semibold leading-tight text-kanbot-primary dark:text-kanbot-dark-primary">
              {percent}%
            </dd>
          </div>
        </dl>
      </div>

      <div
        aria-label="Sprint progress"
        className="mx-5 mb-5 h-2 overflow-hidden rounded-full bg-[var(--kb-soft)]"
      >
        <div
          className="h-full rounded-full bg-green-600 transition-[width] duration-500 dark:bg-green-400"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// ─── Board Column ────────────────────────────────────────────────────────────

function BoardColumn({
  status,
  todos,
  composerOpen,
  onComposerChange,
  onCreate,
  onCardClick,
  onInlineUpdate,
}: {
  status: TodoStatus;
  todos: Todo[];
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

  const styles = COLUMN_STYLES[status];

  return (
    <section
      aria-label={COLUMN_LABELS[status]}
      className="board-column flex w-[18rem] shrink-0 flex-col rounded-2xl border p-3"
      data-status={status}
    >
      <div className="flex items-center justify-between border-b border-kanbot-border px-1 pb-3 pt-0.5 dark:border-kanbot-dark-border">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-kanbot-text dark:text-kanbot-dark-text">
          <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', styles.indicator)} />
          {COLUMN_LABELS[status]}
          <span className="rounded-full bg-kanbot-surface-elevated px-2 py-0.5 text-xs font-medium text-kanbot-muted dark:bg-kanbot-dark-surface-elevated dark:text-kanbot-dark-muted">
            {todos.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => onComposerChange(true)}
          aria-label={`Add task to ${COLUMN_LABELS[status]}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-kanbot-muted transition-colors hover:bg-kanbot-surface-elevated hover:text-kanbot-text dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text"
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
            'flex min-h-[10rem] flex-1 flex-col gap-3 rounded-xl pt-3 transition-colors',
            isOver && 'bg-kanbot-primary/10 ring-2 ring-inset ring-kanbot-primary/40',
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
            <p className="rounded-xl border border-dashed border-kanbot-border px-3 py-8 text-center text-xs text-kanbot-muted dark:border-kanbot-dark-border dark:text-kanbot-dark-muted">
              No tasks yet
            </p>
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
      close();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="mt-3 rounded-xl border border-kanbot-border bg-kanbot-surface p-3 shadow-sm dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface">
      <textarea
        autoFocus
        rows={2}
        maxLength={200}
        value={value}
        disabled={pending}
        aria-label={`New task title for ${COLUMN_LABELS[status]}`}
        placeholder="What needs doing?"
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
          if (event.key === 'Escape') close();
        }}
        className="w-full resize-none bg-transparent text-sm text-kanbot-text placeholder:text-kanbot-muted focus:outline-none disabled:opacity-50 dark:text-kanbot-dark-text dark:placeholder:text-kanbot-dark-muted"
      />
      {error && (
        <p role="alert" className="mb-2 text-xs font-medium text-red-600 dark:text-red-400">
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
        'board-task-card kb-lift h-fit w-full flex-none self-start cursor-pointer p-3.5',
        isDragging && 'opacity-40 ring-2 ring-kanbot-primary/40',
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
        <span className="kb-muted inline-flex min-w-0 items-center gap-1.5 font-mono text-[11px]">
          <TypeIcon type={todo.type} size="h-3.5 w-3.5" className="shrink-0" />
          <span className="truncate">{todo.key}</span>
        </span>
        <PointsBadge points={todo.storyPoints} />
      </div>

      <p className="kb-text mt-2 text-[15px] font-semibold leading-snug">{todo.title}</p>
      {todo.description.trim() && (
        <p className="kb-muted mt-1 line-clamp-2 text-[13px] leading-relaxed">
          {todo.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={todo.priority} />
        {todo.labels.slice(0, 2).map((label) => (
          <LabelChip key={label} label={label} />
        ))}
        {todo.labels.length > 2 && (
          <span className="kb-muted text-[11px]">+{todo.labels.length - 2}</span>
        )}
      </div>
      <div className="relative mt-3 flex items-center justify-between gap-2 border-t border-kanbot-border pt-2.5 dark:border-kanbot-dark-border">
        <TodoDueDate dueDate={todo.dueDate} />
        <InlineTodoFields todo={todo} onSave={onInlineUpdate} />
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
  const [expanded, setExpanded] = useState(false);
  const isOpen = expanded || isGenerating || Boolean(generateError);

  return (
    <div className="overflow-hidden rounded-xl border border-kanbot-border bg-kanbot-surface-elevated dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setExpanded((current) => !current)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <SparklesIcon className="h-4 w-4 shrink-0 text-kanbot-primary dark:text-kanbot-dark-primary" />
          <span className="text-xs font-semibold text-kanbot-muted dark:text-kanbot-dark-muted">
            Sprint summary
          </span>
          {sprint.summary && (
            <span className="hidden text-[10px] text-kanbot-muted sm:inline dark:text-kanbot-dark-muted">
              Generated {new Date(sprint.summary.generatedAt).toLocaleDateString()}
            </span>
          )}
          <ChevronDownIcon
            className={cn(
              'h-4 w-4 shrink-0 text-kanbot-muted transition-transform dark:text-kanbot-dark-muted',
              isOpen && 'rotate-180',
            )}
          />
        </button>
        <Button
          variant={sprint.summary ? 'ghost' : 'secondary'}
          size="sm"
          onClick={() => {
            setExpanded(true);
            onGenerate();
          }}
          loading={isGenerating}
          loadingText="Generating..."
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          {sprint.summary ? 'Regenerate' : 'Summarize sprint'}
        </Button>
      </div>

      {isOpen && (
        <div className="space-y-3 border-t border-kanbot-border px-4 py-3 dark:border-kanbot-dark-border">
          {!sprint.summary && !isGenerating && !generateError && (
            <p className="text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
              No summary yet. Generate one to see a recap of this sprint.
            </p>
          )}
          {generateError && (
            <p className="text-xs text-red-600 dark:text-red-400">{generateError}</p>
          )}

          {isGenerating && (
            <div className="flex items-center gap-2 text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
              <Spinner className="h-4 w-4 text-kanbot-primary" />
              Generating summary...
            </div>
          )}

          {sprint.summary && !isGenerating && (
            <div className="prose prose-sm max-w-none text-kanbot-muted dark:text-kanbot-dark-muted dark:prose-invert">
              <ReactMarkdown>{sprint.summary.content}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
