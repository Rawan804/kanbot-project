import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateTodoRequest, Todo, UpdateTodoRequest } from '../../../types/api';
import {
  TODO_STATUSES,
  TODO_TYPES,
  TODO_PRIORITIES,
} from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { ApiError, fieldErrors, getErrorMessage } from '../../../lib/api-error';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { TextField } from '../../../shared/components/TextField';
import { TextArea } from '../../../shared/components/TextArea';
import { PointsSelect } from '../../../shared/components/PointsSelect';
import { AlertTriangleIcon, SparklesIcon, TrashIcon } from '../../../shared/components/icons';
import { useCreateTodo, useUpdateTodo } from '../hooks/useTodoMutations';
import { useSprints } from '../hooks/useSprints';
import {
  todoFormSchema,
  parseLabels,
  labelsToString,
  type TodoFormValues,
} from '../schemas/todoSchema';

interface TodoDetailsDialogProps {
  /** null = create mode; a Todo object = edit mode. */
  todo: Todo | null;
  initialSprintId?: string;
  projectId: string;
  onClose: () => void;
  onDelete: (todo: Todo) => void;
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const TYPE_LABELS: Record<string, string> = {
  task: 'Task',
  story: 'Story',
  bug: 'Bug',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

/**
 * Create and edit todo dialog.
 * - todo = null  → create mode (POST /todos)
 * - todo = Todo  → edit mode   (PATCH /todos/:id)
 */
export function TodoDetailsDialog({
  todo,
  initialSprintId,
  projectId,
  onClose,
  onDelete,
}: TodoDetailsDialogProps) {
  return (
    <TodoForm
      key={todo?.id ?? `create-${initialSprintId ?? 'backlog'}`}
      todo={todo}
      initialSprintId={initialSprintId}
      projectId={projectId}
      onClose={onClose}
      onDelete={onDelete}
    />
  );
}

function TodoForm({
  todo,
  initialSprintId,
  projectId,
  onClose,
  onDelete,
}: {
  todo: Todo | null;
  initialSprintId?: string;
  projectId: string;
  onClose: () => void;
  onDelete: (todo: Todo) => void;
}) {
  const createTodo = useCreateTodo(projectId);
  const updateTodo = useUpdateTodo(projectId);
  const {
    data: sprints,
    isLoading: sprintsLoading,
    isError: sprintsError,
    error: sprintsErr,
    refetch: refetchSprints,
  } = useSprints(projectId);

  const [formError, setFormError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const form = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: {
      title: todo?.title ?? '',
      description: todo?.description ?? '',
      type: todo?.type ?? 'task',
      status: todo?.status ?? 'todo',
      priority: todo?.priority ?? 'medium',
      storyPoints: todo?.storyPoints ?? null,
      labels: labelsToString(todo?.labels ?? []),
      dueDate: todo?.dueDate ?? '',
      sprintId: todo?.sprintId ?? initialSprintId ?? '',
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const points = useWatch({ control, name: 'storyPoints' });
  const hasUnsaved = isDirty;

  const handleClose = () => {
    if (isSubmitting) return;
    if (hasUnsaved) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const body: CreateTodoRequest = {
      title: values.title.trim(),
      description: values.description,
      type: values.type,
      status: values.status,
      priority: values.priority,
      storyPoints: values.storyPoints,
      labels: parseLabels(values.labels),
      dueDate: values.dueDate || null,
      sprintId: values.sprintId || null,
    };

    try {
      if (todo) {
        await updateTodo.mutateAsync({
          todoId: todo.id,
          body: body satisfies UpdateTodoRequest,
        });
      } else {
        await createTodo.mutateAsync(body);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const serverErrors = fieldErrors(err);
        if (Object.keys(serverErrors).length > 0) {
          for (const [field, message] of Object.entries(serverErrors)) {
            const known: (keyof TodoFormValues)[] = [
              'title', 'description', 'type', 'status', 'priority',
              'storyPoints', 'labels', 'dueDate', 'sprintId',
            ];
            if (known.includes(field as keyof TodoFormValues)) {
              setError(field as keyof TodoFormValues, { message });
            }
          }
          return;
        }
        setFormError(getErrorMessage(err));
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  });

  const requestAI = (prompt: string) => {
    if (isDirty) return;
    onClose();
    window.dispatchEvent(new CustomEvent('kanbot:ai-prompt', { detail: { prompt } }));
  };

  const sprintOptions = (sprints ?? []).filter(
    (s) => s.status === 'planned' || s.status === 'active',
  );

  return (
    <>
      <Modal
        open
        onClose={handleClose}
        title={todo ? todo.key : 'Create todo'}
        description={todo?.title}
        size="lg"
        closeOnBackdrop={!hasUnsaved}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            {todo ? (
              <Button
                variant="danger-ghost"
                size="sm"
                onClick={() => onDelete(todo)}
                type="button"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="todo-details-form"
                loading={isSubmitting}
                loadingText={todo ? 'Saving...' : 'Creating...'}
                disabled={!hasUnsaved}
              >
                {todo ? 'Save changes' : 'Create todo'}
              </Button>
            </div>
          </div>
        }
      >
        {formError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          >
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <span>{formError}</span>
          </div>
        )}

        {todo && (
          <div className="mb-4 kb-tone-lav rounded-2xl p-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isDirty}
                onClick={() => {
                  const prompt = [
                    `Improve todo ${todo.key} without inventing requirements.`,
                    `Current title: ${todo.title}`,
                    `Current description: ${todo.description || '(empty)'}`,
                    'Suggest a clearer title, concise description, and testable acceptance criteria in Markdown.',
                    'Do not update the todo automatically; return a suggestion for review.',
                  ].join('\n');
                  requestAI(prompt);
                }}
              >
                <SparklesIcon className="h-3.5 w-3.5" />
                Improve with AI
              </Button>
              {todo.storyPoints === null && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isDirty}
                  onClick={() => {
                    const prompt = [
                      `Estimate story points for todo ${todo.key}.`,
                      `Title: ${todo.title}`,
                      `Description: ${todo.description || '(empty)'}`,
                      'Choose only from 1, 2, 3, 5, 8, or 13 and explain the estimate briefly.',
                      'Do not update the todo automatically; return a suggestion for review.',
                    ].join('\n');
                    requestAI(prompt);
                  }}
                >
                  <SparklesIcon className="h-3.5 w-3.5" />
                  Estimate
                </Button>
              )}
            </div>
            <p className="mt-2 text-[10px] text-[color:var(--kb-muted)]">
              Save or cancel edits to request suggestions. AI never changes this todo automatically.
            </p>
          </div>
        )}

        <form id="todo-details-form" onSubmit={onSubmit} noValidate>
          <TextField
            label="Title"
            autoFocus
            autoComplete="off"
            error={errors.title?.message}
            {...register('title')}
          />

          <TextArea
            label="Description"
            rows={4}
            placeholder="Add more details..."
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid gap-x-4 sm:grid-cols-2">
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--kb-text)]">
                Type
              </label>
              <select className={selectClass(!!errors.type)} {...register('type')}>
                {(TODO_TYPES as readonly string[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
              {errors.type && <FieldError msg={errors.type.message} />}
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--kb-text)]">
                Status
              </label>
              <select className={selectClass(!!errors.status)} {...register('status')}>
                {(TODO_STATUSES as readonly string[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                ))}
              </select>
              {errors.status && <FieldError msg={errors.status.message} />}
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--kb-text)]">
                Priority
              </label>
              <select className={selectClass(!!errors.priority)} {...register('priority')}>
                {(TODO_PRIORITIES as readonly string[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p] ?? p}</option>
                ))}
              </select>
              {errors.priority && <FieldError msg={errors.priority.message} />}
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--kb-text)]">
                Due date
              </label>
              <input
                type="date"
                className={cn(selectClass(!!errors.dueDate), 'cursor-pointer')}
                {...register('dueDate')}
              />
              {errors.dueDate && <FieldError msg={errors.dueDate.message} />}
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-1.5 text-sm font-medium text-[color:var(--kb-text)]">
              Story points
            </p>
            <PointsSelect
              value={points}
              onChange={(value) =>
                setValue('storyPoints', value, { shouldDirty: true, shouldValidate: true })
              }
            />
            {errors.storyPoints && <FieldError msg={errors.storyPoints.message} />}
          </div>

          <TextField
            label="Labels"
            placeholder="frontend, bug-fix, api (comma-separated)"
            hint="Separate labels with commas."
            error={errors.labels?.message}
            {...register('labels')}
          />

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-[color:var(--kb-text)]">
              Sprint
            </label>
            <select className={selectClass(!!errors.sprintId)} {...register('sprintId')}>
              <option value="">Backlog (no sprint)</option>
              {sprintOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.status === 'active' ? ' (active)' : ''}
                </option>
              ))}
            </select>
            {sprintsLoading && (
              <p className="mt-1.5 text-xs text-[color:var(--kb-muted)]">
                Loading sprints...
              </p>
            )}
            {sprintsError && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-red-600 dark:text-red-400">
                <span>Couldn't load sprints: {getErrorMessage(sprintsErr)}</span>
                <button
                  type="button"
                  onClick={() => refetchSprints()}
                  className="font-medium underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
                >
                  Retry
                </button>
              </div>
            )}
            {errors.sprintId && <FieldError msg={errors.sprintId.message} />}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => { setConfirmClose(false); onClose(); }}
        title="Discard changes?"
        confirmLabel="Discard"
        tone="danger"
      >
        <p>You have unsaved changes. Are you sure you want to close without saving?</p>
      </ConfirmDialog>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function selectClass(hasError: boolean): string {
  return cn(
    'w-full rounded-2xl border text-sm px-4 py-2.5',
    'bg-[color:var(--kb-surface)] text-[color:var(--kb-text)]',
    'focus:outline-none focus:ring-2 transition-colors cursor-pointer',
    hasError
      ? 'border-[color:var(--kb-rose-dot)] focus:border-[color:var(--kb-rose-dot)] focus:ring-[color:var(--kb-rose-dot)]/40'
      : 'border-[color:var(--kb-line)] focus:border-[color:var(--kb-primary)] focus:ring-[color:var(--kb-lav-dot)]/40',
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      {msg}
    </p>
  );
}
