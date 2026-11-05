import { useRef, useState } from 'react';
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
import type { Sprint, Todo, TodoStatus } from '../../../types/api';
import { TODO_STATUSES } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import {
  AlertTriangleIcon,
  BacklogIcon,
  BoardIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '../../../shared/components/icons';
import { TypeIcon } from '../../../shared/components/TypeIcon';
import { PriorityBadge } from '../../../shared/components/PriorityBadge';
import { PointsBadge } from '../../../shared/components/PointsSelect';
import { useProject } from '../../projects/hooks/useProjects';
import { useSprints } from '../../backlog/hooks/useSprints';
import { useSprintBoard, useMoveBoardTodo } from '../../sprints/hooks/useSprintMutations';
import { useGenerateSprintSummary } from '../../sprints/hooks/useSprintMutations';
import { getErrorMessage } from '../../../lib/api-error';
import ReactMarkdown from 'react-markdown';
import { TodoDetailsDialog } from '../../backlog/components/TodoDetailsDialog';
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

const COLUMN_ACCENT: Record<TodoStatus, string> = {
  todo: 'border-slate-300',
  in_progress: 'border-blue-400',
  in_review: 'border-amber-400',
  done: 'border-green-500',
};


export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);
  const { data: allSprints, isLoading: sprintsLoading } = useSprints(projectId);

  const activeSprint = allSprints?.find((s) => s.status === 'active');
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
  const [completeOpen, setCompleteOpen] = useState(false);
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

    // Source column from the active item's sortable data.
    const sourceStatus: TodoStatus =
      (active.data.current?.sortable?.containerId as TodoStatus) ?? 'todo';
    // Destination column — could be a column droppable or another card.
    const destStatus: TodoStatus =
      (over.data.current?.sortable?.containerId as TodoStatus) ??
      (over.data.current?.columnStatus as TodoStatus) ??
      sourceStatus;

    if (active.id === over.id) return;

    const destColumn = boardData?.columns[destStatus] ?? [];

    let position: number;
    if (sourceStatus === destStatus) {
      // Same column reorder.
      const currentIndex = destColumn.findIndex((t) => t.id === todoId);
      const overIndex = destColumn.findIndex((t) => t.id === overId);
      position = currentIndex < overIndex ? overIndex - 1 : overIndex;
    } else {
      // Cross-column move: insert at the position of the over item.
      const overIndex = destColumn.findIndex((t) => t.id === overId);
      position = overIndex >= 0 ? overIndex : destColumn.length;
    }

    moveBoardTodo.mutate(
      { todoId, body: { status: destStatus, position } },
      { onError: (err) => showMoveError(getErrorMessage(err)) },
    );
  };

  // Find dragged todo for DragOverlay.
  const activeTodo = activeDragId
    ? Object.values(boardData?.columns ?? {}).flat().find((t) => t.id === activeDragId)
    : null;

  // ── Empty state: no active sprint ─────────────────────────────────────────
  if (!sprintsLoading && !activeSprint) {
    return (
      <EmptyState
        icon={<BoardIcon className="h-7 w-7" />}
        title="No active sprint"
        description="Start a sprint from your backlog to begin tracking work here."
        action={
          <Link
            to={`/projects/${projectId}/backlog`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2f4bff] px-4 text-sm font-semibold text-white hover:bg-[#253ecc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
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
    <div className="flex flex-col gap-5">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {project?.name ?? 'Project'} · Active Sprint
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {activeSprint?.name ?? 'Board'}
          </h1>
        </div>
        {activeSprint && (
          <Button
            variant="secondary"
            onClick={() => setCompleteOpen(true)}
          >
            <CheckCircleIcon className="h-4 w-4" />
            Complete sprint
          </Button>
        )}
      </div>

      {/* ── Move error ─────────────────────────────────────────────────────── */}
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
            aria-label="Dismiss"
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Sprint header details ────────────────────────────────────────── */}
      {activeSprint && <SprintHeader sprint={activeSprint} />}

      {/* ── AI summary section (AI-4) ────────────────────────────────────── */}
      {activeSprint && (
        <BoardSummarySection
          sprint={activeSprint}
          projectId={projectId ?? ''}
          onGenerate={() => generateSummary.mutate(activeSprint.id)}
          isGenerating={generateSummary.isPending}
          generateError={generateSummary.isError ? getErrorMessage(generateSummary.error) : null}
        />
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20">
          <Spinner className="h-6 w-6 text-[#2f4bff]" />
          <span className="text-sm text-slate-500">Loading board…</span>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
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

      {/* ── Kanban board ─────────────────────────────────────────────────── */}
      {!isLoading && !boardError && boardData && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Mobile: horizontal scroll; Desktop: fixed 4-column grid */}
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[44rem] auto-cols-fr grid-flow-col gap-4 lg:min-w-0">
              {(TODO_STATUSES as readonly TodoStatus[]).map((status) => (
                <BoardColumn
                  key={status}
                  status={status}
                  todos={boardData.columns[status] ?? []}
                  onCardClick={setSelectedTodo}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeTodo ? (
              <div className="rounded-xl border border-[#2f4bff]/30 bg-white px-3 py-3 shadow-2xl opacity-90 pointer-events-none">
                <div className="flex items-start gap-2">
                  <TypeIcon type={activeTodo.type} size="h-4 w-4" className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] text-slate-400">{activeTodo.key}</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-800 line-clamp-2">
                      {activeTodo.title}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Todo details dialog ──────────────────────────────────────────── */}
      {selectedTodo && projectId && (
        <TodoDetailsDialog
          todo={selectedTodo}
          projectId={projectId}
          onClose={() => setSelectedTodo(null)}
          onDelete={() => setSelectedTodo(null)}
        />
      )}

      {/* ── Complete sprint dialog ───────────────────────────────────────── */}
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {sprint.goal && (
            <p className="text-sm text-slate-600 mb-1">{sprint.goal}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {startLabel && endLabel && (
              <span>{startLabel} – {endLabel}</span>
            )}
            {remaining !== null && (
              <span className={cn('font-medium', overdue ? 'text-red-600' : 'text-slate-600')}>
                {overdue
                  ? 'Overdue'
                  : remaining === 0
                    ? 'Last day'
                    : `${remaining} day${remaining === 1 ? '' : 's'} left`}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-4 text-sm">
          <span className="text-slate-500">
            <span className="font-semibold text-slate-800">{stats.doneTodos}</span>
            /{stats.totalTodos} done
          </span>
          {stats.totalPoints > 0 && (
            <span className="text-slate-500">
              <span className="font-semibold text-slate-800">{stats.donePoints}</span>
              /{stats.totalPoints} pts
            </span>
          )}
        </div>
      </div>

      {/* Progress bar — based on story points if any exist, else todo count */}
      <div aria-label="Sprint progress">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#2f4bff] transition-all duration-500"
            style={{
              width: `${stats.totalPoints > 0 ? ptsPercent : todosPercent}%`,
            }}
            role="progressbar"
            aria-valuenow={stats.totalPoints > 0 ? ptsPercent : todosPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="mt-1 text-right text-[11px] text-slate-400">
          {stats.totalPoints > 0 ? `${ptsPercent}%` : `${todosPercent}%`} complete
        </p>
      </div>
    </div>
  );
}

// ─── Board Column ────────────────────────────────────────────────────────────

function BoardColumn({
  status,
  todos,
  onCardClick,
}: {
  status: TodoStatus;
  todos: Todo[];
  onCardClick: (todo: Todo) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { columnStatus: status },
  });

  return (
    <div className="flex flex-col gap-2">
      {/* Column header */}
      <div className={cn('rounded-xl border-t-2 bg-slate-50 px-3 py-2.5', COLUMN_ACCENT[status])}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            {COLUMN_LABELS[status]}
          </span>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
            {todos.length}
          </span>
        </div>
      </div>

      {/* Card list */}
      <SortableContext
        id={status}
        items={todos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-[10rem] flex-col gap-2 rounded-xl border border-slate-200 p-2 transition-colors',
            isOver && 'bg-[#eef1ff]/60 border-[#2f4bff]/30',
          )}
        >
          {todos.map((todo) => (
            <BoardCard key={todo.id} todo={todo} onOpen={onCardClick} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Board Card ──────────────────────────────────────────────────────────────

function BoardCard({ todo, onOpen }: { todo: Todo; onOpen: (todo: Todo) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'group rounded-xl border border-slate-200 bg-white p-3 shadow-sm',
        'cursor-pointer transition-all hover:shadow-md hover:border-slate-300',
        isDragging && 'opacity-40 ring-2 ring-[#2f4bff]/30',
      )}
      aria-label={`Open ${todo.key}: ${todo.title}`}
      onClick={() => onOpen(todo)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(todo); }
      }}
    >
      {/* Drag handle area + type icon + key */}
      <div className="flex items-start gap-2" {...listeners}>
        <TypeIcon type={todo.type} size="h-4 w-4" className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] text-slate-400">{todo.key}</p>
          <p className="mt-0.5 text-sm font-medium text-slate-800 leading-snug">
            {todo.title}
          </p>
        </div>
      </div>

      {/* Footer: priority + points */}
      <div className="mt-2.5 flex items-center justify-between">
        <PriorityBadge priority={todo.priority} />
        <PointsBadge points={todo.storyPoints} />
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
  sprint: import('../../../types/api').Sprint;
  projectId: string;
  isGenerating: boolean;
  generateError: string | null;
  onGenerate: () => void;
}) {
  if (!sprint.summary && !isGenerating && !generateError) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="h-4 w-4 text-[#2f4bff]" />
          <span className="text-xs font-semibold text-slate-600">AI Summary</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          Summarize sprint
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="h-4 w-4 text-[#2f4bff]" />
          <span className="text-xs font-semibold text-slate-600">AI Summary</span>
          {sprint.summary && (
            <span className="text-[10px] text-slate-400">
              Generated {new Date(sprint.summary.generatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerate}
          loading={isGenerating}
          loadingText="Generating…"
        >
          {sprint.summary ? 'Regenerate' : 'Generate'}
        </Button>
      </div>

      {generateError && (
        <p className="text-xs text-red-600">{generateError}</p>
      )}

      {isGenerating && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Spinner className="h-4 w-4 text-[#2f4bff]" />
          Generating summary…
        </div>
      )}

      {sprint.summary && !isGenerating && (
        <div className="prose prose-sm max-w-none text-slate-700">
          <ReactMarkdown>{sprint.summary.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
