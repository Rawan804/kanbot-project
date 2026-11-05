import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Todo, StoryPoints, UpdateTodoRequest } from '../../../types/api';
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
import { AlertTriangleIcon, TrashIcon } from '../../../shared/components/icons';
import { useUpdateTodo } from '../hooks/useTodoMutations';
import { useSprints } from '../hooks/useSprints';
import {
  todoFormSchema,
  parseLabels,
  labelsToString,
  type TodoFormValues,
} from '../schemas/todoSchema';

interface TodoDetailsDialogProps {
  /** null = creating a new todo (not yet used here — create is via QuickCreate or future full form). */
  todo: Todo | null;
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
 * BL-3: Full edit dialog for a todo.
 *
 * Strategy
 * ────────
 * The form is mounted fresh for each todo (key={todo.id} at the call site in
 * BacklogPage) so defaultValues always reflect the current todo — no reset
 * effect needed (avoids the react-hooks/set-state-in-effect lint rule).
 *
 * storyPoints is controlled outside RHF (PointsSelect returns StoryPoints|null)
 * and tracked via useState. Its current value is compared against the original
 * when determining isDirty.
 *
 * Unsaved changes
 * ───────────────
 * We check RHF's `isDirty` OR a change in storyPoints to detect unsaved work.
 * If the user tries to close with unsaved changes, a ConfirmDialog asks.
 *
 * Server errors
 * ─────────────
 * fieldErrors() maps details[] → setError(field). 409 conflicts and
 * validation errors land on specific fields; everything else goes to a
 * form-level error banner.
 */
export function TodoDetailsDialog({
  todo,
  projectId,
  onClose,
  onDelete,
}: TodoDetailsDialogProps) {
  if (!todo) return null;
  return (
    <TodoForm
      key={todo.id}
      todo={todo}
      projectId={projectId}
      onClose={onClose}
      onDelete={onDelete}
    />
  );
}

function TodoForm({
  todo,
  projectId,
  onClose,
  onDelete,
}: {
  todo: Todo;
  projectId: string;
  onClose: () => void;
  onDelete: (todo: Todo) => void;
}) {
  const updateTodo = useUpdateTodo(projectId);
  const { data: sprints } = useSprints(projectId);

  const [points, setPoints] = useState<StoryPoints | null>(todo.storyPoints);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const form = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: {
      title: todo.title,
      description: todo.description ?? '',
      type: todo.type,
      status: todo.status,
      priority: todo.priority,
      labels: labelsToString(todo.labels),
      dueDate: todo.dueDate ?? '',
      sprintId: todo.sprintId ?? '',
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const pointsDirty = points !== todo.storyPoints;
  const hasUnsaved = isDirty || pointsDirty;

  const handleClose = () => {
    if (hasUnsaved) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const body: UpdateTodoRequest = {
      title: values.title.trim(),
      description: values.description,
      type: values.type,
      status: values.status,
      priority: values.priority,
      storyPoints: points,
      labels: parseLabels(values.labels),
      dueDate: values.dueDate || null,
      sprintId: values.sprintId || null,
    };

    try {
      await updateTodo.mutateAsync({ todoId: todo.id, body });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const serverErrors = fieldErrors(err);
        if (Object.keys(serverErrors).length > 0) {
          for (const [field, message] of Object.entries(serverErrors)) {
            const known: (keyof TodoFormValues)[] = [
              'title', 'description', 'type', 'status',
              'priority', 'labels', 'dueDate', 'sprintId',
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

  // Available sprints for the sprint select (planned + active only).
  const sprintOptions = (sprints ?? []).filter(
    (s) => s.status === 'planned' || s.status === 'active',
  );

  return (
    <>
      <Modal
        open
        onClose={handleClose}
        title={todo.key}
        description={todo.title !== todo.key ? undefined : undefined}
        size="lg"
        closeOnBackdrop={!hasUnsaved}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="danger-ghost"
              size="sm"
              onClick={() => onDelete(todo)}
              type="button"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="todo-details-form"
                loading={isSubmitting}
                loadingText="Saving…"
                disabled={!hasUnsaved}
              >
                Save changes
              </Button>
            </div>
          </div>
        }
      >
        {/* Form error banner */}
        {formError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{formError}</span>
          </div>
        )}

        <form id="todo-details-form" onSubmit={onSubmit} noValidate>
          {/* Title */}
          <TextField
            label="Title"
            autoFocus
            autoComplete="off"
            error={errors.title?.message}
            {...register('title')}
          />

          {/* Description */}
          <TextArea
            label="Description"
            rows={4}
            placeholder="Add more details…"
            error={errors.description?.message}
            {...register('description')}
          />

          {/* Two-column grid for the metadata fields */}
          <div className="grid gap-x-4 sm:grid-cols-2">
            {/* Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-800 mb-1.5">
                Type
              </label>
              <select
                className={selectClass(!!errors.type)}
                aria-invalid={!!errors.type}
                {...register('type')}
              >
                {(TODO_TYPES as readonly string[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t] ?? t}
                  </option>
                ))}
              </select>
              {errors.type && <FieldError msg={errors.type.message} />}
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-800 mb-1.5">
                Status
              </label>
              <select
                className={selectClass(!!errors.status)}
                aria-invalid={!!errors.status}
                {...register('status')}
              >
                {(TODO_STATUSES as readonly string[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
              {errors.status && <FieldError msg={errors.status.message} />}
            </div>

            {/* Priority */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-800 mb-1.5">
                Priority
              </label>
              <select
                className={selectClass(!!errors.priority)}
                aria-invalid={!!errors.priority}
                {...register('priority')}
              >
                {(TODO_PRIORITIES as readonly string[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p] ?? p}
                  </option>
                ))}
              </select>
              {errors.priority && <FieldError msg={errors.priority.message} />}
            </div>

            {/* Due date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-800 mb-1.5">
                Due date
              </label>
              <input
                type="date"
                className={cn(selectClass(!!errors.dueDate), 'cursor-pointer')}
                aria-invalid={!!errors.dueDate}
                {...register('dueDate')}
              />
              {errors.dueDate && <FieldError msg={errors.dueDate.message} />}
            </div>
          </div>

          {/* Story points */}
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-800 mb-1.5">Story points</p>
            <PointsSelect value={points} onChange={setPoints} />
          </div>

          {/* Labels */}
          <TextField
            label="Labels"
            placeholder="frontend, bug-fix, api (comma-separated)"
            hint="Separate labels with commas."
            error={errors.labels?.message}
            {...register('labels')}
          />

          {/* Sprint */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Sprint
            </label>
            <select
              className={selectClass(!!errors.sprintId)}
              aria-invalid={!!errors.sprintId}
              {...register('sprintId')}
            >
              <option value="">Backlog (no sprint)</option>
              {sprintOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.status === 'active' ? ' (active)' : ''}
                </option>
              ))}
            </select>
            {errors.sprintId && <FieldError msg={errors.sprintId.message} />}
          </div>
        </form>
      </Modal>

      {/* Unsaved changes confirmation */}
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
    'w-full rounded-lg border bg-white text-slate-900 text-sm px-3 py-2.5',
    'focus:outline-none focus:ring-2 transition-colors cursor-pointer',
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-300 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20',
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
      {msg}
    </p>
  );
}
