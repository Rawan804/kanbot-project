import { useState } from 'react';
import { Link, useParams } from 'react-router';
import type { Todo } from '../../../types/api';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Spinner } from '../../../shared/components/Spinner';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../../../shared/components/icons';
import { LabelChip, TodoDueDate } from '../../../shared/components/TodoIndicators';
import { getErrorMessage } from '../../../lib/api-error';
import { cn } from '../../../shared/lib/cn';
import { useProject } from '../../projects/hooks/useProjects';
import { useDeleteTodo } from '../hooks/useTodoMutations';
import { useTodos } from '../hooks/useTodos';
import { TodoDetailsDialog } from './TodoDetailsDialog';

function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

export function MyWeekPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);
  const { data: todos, isLoading, isError, error, refetch } = useTodos(projectId);
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);
  const deleteTodo = useDeleteTodo(projectId ?? '');
  const endOfWeek = shiftDate(week, 6);
  const weekStartKey = dateKey(week);
  const weekEndKey = dateKey(endOfWeek);
  const currentWeekStart = dateKey(startOfWeek(new Date()));

  const dueTodos = (todos ?? [])
    .filter((todo) => todo.dueDate && todo.dueDate >= weekStartKey && todo.dueDate <= weekEndKey)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.order - b.order);
  const overdueTodos = (todos ?? [])
    .filter((todo) => todo.dueDate && todo.dueDate < weekStartKey && todo.status !== 'done')
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

  const confirmDelete = () => {
    if (!deletingTodo) return;
    deleteTodo.mutate(deletingTodo.id, {
      onSuccess: () => setDeletingTodo(null),
    });
  };

  const weekLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(week);
  const endLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(endOfWeek);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-kanbot-muted dark:text-kanbot-dark-muted">
            {project?.name ?? 'Project'}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-kanbot-text dark:text-kanbot-dark-text">
            My week
          </h1>
          <p className="mt-1 text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
            Work organized by due date, Monday through Sunday.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-kanbot-border bg-kanbot-surface p-1 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setWeek((current) => shiftDate(current, -7))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-kanbot-muted hover:bg-kanbot-surface-elevated hover:text-kanbot-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="min-w-32 px-2 text-center text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text">
            {weekLabel} – {endLabel}
          </span>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setWeek((current) => shiftDate(current, 7))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-kanbot-muted hover:bg-kanbot-surface-elevated hover:text-kanbot-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          {weekStartKey !== currentWeekStart && (
            <Button size="sm" variant="ghost" onClick={() => setWeek(startOfWeek(new Date()))}>
              Today
            </Button>
          )}
        </div>
      </header>

      {isLoading && (
        <div role="status" className="flex items-center justify-center gap-3 rounded-2xl border border-kanbot-border bg-kanbot-surface py-16 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface">
          <Spinner className="h-5 w-5 text-kanbot-primary" />
          <span className="text-sm text-kanbot-muted dark:text-kanbot-dark-muted">Loading your week…</span>
        </div>
      )}
      {isError && (
        <EmptyState
          tone="error"
          icon={<CalendarIcon className="h-7 w-7" />}
          title="Couldn't load your week"
          description={getErrorMessage(error)}
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      )}

      {!isLoading && !isError && (
        <div className="space-y-5">
          {overdueTodos.length > 0 && (
            <TodoGroup title="Overdue" todos={overdueTodos} tone="overdue" onOpen={setSelectedTodo} />
          )}
          {dueTodos.length > 0 ? (
            <TodoGroup title="Due this week" todos={dueTodos} onOpen={setSelectedTodo} />
          ) : (
            <EmptyState
              icon={<CalendarIcon className="h-7 w-7" />}
              title="Nothing due this week"
              description="Add due dates to your todos to plan the week ahead."
              action={
                <Link
                  to={`/projects/${projectId}/backlog`}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-kanbot-primary px-4 text-sm font-semibold text-white hover:bg-kanbot-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary"
                >
                  Open backlog
                </Link>
              }
            />
          )}
        </div>
      )}

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
        onConfirm={confirmDelete}
        title="Delete todo"
        confirmLabel="Delete"
        tone="danger"
        loading={deleteTodo.isPending}
      >
        {deletingTodo && (
          <p>
            Delete <span className="font-semibold">{deletingTodo.key}: {deletingTodo.title}</span>?
            This action cannot be undone.
          </p>
        )}
        {deleteTodo.isError && <p role="alert" className="mt-3 text-sm text-red-600">{getErrorMessage(deleteTodo.error)}</p>}
      </ConfirmDialog>
    </div>
  );
}

function TodoGroup({
  title,
  todos,
  tone = 'default',
  onOpen,
}: {
  title: string;
  todos: Todo[];
  tone?: 'overdue' | 'default';
  onOpen: (todo: Todo) => void;
}) {
  return (
    <section aria-label={title} className="overflow-hidden rounded-2xl border border-kanbot-border bg-kanbot-surface dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface">
      <header className="flex items-center justify-between border-b border-kanbot-border px-4 py-3 dark:border-kanbot-dark-border">
        <h2 className={cn('text-sm font-semibold', tone === 'overdue' ? 'text-red-700 dark:text-red-400' : 'text-kanbot-text dark:text-kanbot-dark-text')}>
          {title}
        </h2>
        <span className="rounded-full bg-kanbot-surface-elevated px-2 py-0.5 text-xs text-kanbot-muted dark:bg-kanbot-dark-surface-elevated dark:text-kanbot-dark-muted">
          {todos.length}
        </span>
      </header>
      <div className="divide-y divide-kanbot-border dark:divide-kanbot-dark-border">
        {todos.map((todo) => (
          <button
            key={todo.id}
            type="button"
            onClick={() => onOpen(todo)}
            className="flex w-full min-w-0 flex-wrap items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-kanbot-surface-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-kanbot-primary dark:hover:bg-kanbot-dark-surface-elevated"
          >
            <span className="w-16 shrink-0 font-mono text-[11px] text-kanbot-muted dark:text-kanbot-dark-muted">{todo.key}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text">{todo.title}</span>
            <div className="flex max-w-full flex-wrap gap-1">
              {todo.labels.slice(0, 3).map((label) => <LabelChip key={label} label={label} />)}
            </div>
            <TodoDueDate dueDate={todo.dueDate} />
            <span className="text-[10px] capitalize text-kanbot-muted dark:text-kanbot-dark-muted">{todo.status.replace('_', ' ')}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
