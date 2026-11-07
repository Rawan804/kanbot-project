import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Sprint } from '../../../types/api';
import { ApiError, fieldErrors, getErrorMessage } from '../../../lib/api-error';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { TextField } from '../../../shared/components/TextField';
import { TextArea } from '../../../shared/components/TextArea';
import { AlertTriangleIcon } from '../../../shared/components/icons';
import { cn } from '../../../shared/lib/cn';
import { useCreateSprint, useUpdateSprint } from '../hooks/useSprintMutations';
import { sprintFormSchema, type SprintFormValues } from '../schemas/sprintSchema';
import { getSprintDateRange, SPRINT_TEMPLATES } from '../lib/sprintTemplates';

interface SprintFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** When provided, dialog is in "edit" mode and the form is prefilled. */
  sprint?: Sprint | null;
}

/**
 * SPR-1 / SPR-2: Create or edit a planned sprint.
 *
 * Reuses the same Modal, RHF + Zod pattern as ProjectFormDialog.
 * The form mounts fresh on each open via `key={sprint?.id ?? 'new'}` so
 * defaultValues are always correct without a reset effect.
 */
export function SprintFormDialog({ open, onClose, projectId, sprint }: SprintFormDialogProps) {
  const isEdit = Boolean(sprint);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit sprint' : 'Create sprint'}
      description={
        isEdit ? undefined : 'Plan a sprint before moving backlog items into it.'
      }
      size="md"
    >
      <SprintForm
        key={sprint?.id ?? 'new'}
        projectId={projectId}
        sprint={sprint}
        onClose={onClose}
      />
    </Modal>
  );
}

function SprintForm({
  projectId,
  sprint,
  onClose,
}: {
  projectId: string;
  sprint?: Sprint | null;
  onClose: () => void;
}) {
  const isEdit = Boolean(sprint);
  const createSprint = useCreateSprint(projectId);
  const updateSprint = useUpdateSprint(projectId);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SprintFormValues>({
    resolver: zodResolver(sprintFormSchema),
    defaultValues: {
      name: sprint?.name ?? '',
      goal: sprint?.goal ?? '',
      startDate: sprint?.startDate ?? '',
      endDate: sprint?.endDate ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    // Strip empty strings — server generates name when absent (SPR-1).
    const body = {
      name: values.name.trim() || undefined,
      goal: values.goal.trim() || undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
    };

    try {
      if (sprint) {
        await updateSprint.mutateAsync({ sprintId: sprint.id, body });
      } else {
        await createSprint.mutateAsync(body);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const serverFieldErrors = fieldErrors(err);
        if (Object.keys(serverFieldErrors).length > 0) {
          for (const [field, message] of Object.entries(serverFieldErrors)) {
            if (['name', 'goal', 'startDate', 'endDate'].includes(field)) {
              setError(field as keyof SprintFormValues, { message });
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

  return (
    <form onSubmit={onSubmit} noValidate>
      {formError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>{formError}</span>
        </div>
      )}

      {!isEdit && (
        <div className="mb-4">
          <label htmlFor="sprint-template" className="mb-1.5 block text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text">
            Sprint template
          </label>
          <select
            id="sprint-template"
            defaultValue=""
            onChange={(event) => {
              const template = SPRINT_TEMPLATES.find((item) => item.id === event.target.value);
              if (!template) return;
              try {
                const dates = getSprintDateRange(template.durationDays, getValues('startDate'));
                setValue('startDate', dates.startDate, { shouldDirty: true, shouldValidate: true });
                setValue('endDate', dates.endDate, { shouldDirty: true, shouldValidate: true });
              } catch (error) {
                setFormError(error instanceof Error ? error.message : 'Could not apply the sprint template.');
              }
            }}
            className={dateInputClass(false)}
          >
            <option value="">Choose a sprint duration</option>
            {SPRINT_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.durationDays} days
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-kanbot-muted dark:text-kanbot-dark-muted">
            Applies a suggested duration. You can adjust the dates before saving.
          </p>
        </div>
      )}

      <TextField
        label="Name"
        autoFocus
        placeholder="Sprint 1"
        autoComplete="off"
        hint='Leave blank to auto-generate (e.g. "Sprint 3").'
        error={errors.name?.message}
        {...register('name')}
      />

      <TextArea
        label="Goal"
        rows={2}
        placeholder="What should this sprint achieve?"
        hint="Optional, up to 300 characters."
        error={errors.goal?.message}
        {...register('goal')}
      />

      <div className="grid gap-x-4 sm:grid-cols-2">
        <div className="mb-4">
          <label htmlFor="sprint-start-date" className="block text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text mb-1.5">
            Start date
          </label>
          <input
            id="sprint-start-date"
            type="date"
            aria-invalid={!!errors.startDate}
            className={dateInputClass(!!errors.startDate)}
            {...register('startDate')}
          />
          {errors.startDate && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
              {errors.startDate.message}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="sprint-end-date" className="block text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text mb-1.5">
            End date
          </label>
          <input
            id="sprint-end-date"
            type="date"
            aria-invalid={!!errors.endDate}
            className={dateInputClass(!!errors.endDate)}
            {...register('endDate')}
          />
          {errors.endDate && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
              {errors.endDate.message}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          loadingText={isEdit ? 'Saving…' : 'Creating…'}
        >
          {isEdit ? 'Save changes' : 'Create sprint'}
        </Button>
      </div>
    </form>
  );
}

function dateInputClass(hasError: boolean): string {
  return cn(
    'w-full rounded-lg border text-sm px-3 py-2.5 cursor-pointer',
    'bg-kanbot-surface text-kanbot-text',
    'dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text dark:border-kanbot-dark-border',
    'focus:outline-none focus:ring-2 transition-colors',
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      : 'border-kanbot-border focus:border-kanbot-primary focus:ring-kanbot-primary/20 dark:focus:border-kanbot-dark-primary',
  );
}
