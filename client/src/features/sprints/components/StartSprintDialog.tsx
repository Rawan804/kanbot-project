import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Sprint } from '../../../types/api';
import { ApiError, fieldErrors, getErrorMessage } from '../../../lib/api-error';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { AlertTriangleIcon } from '../../../shared/components/icons';
import { cn } from '../../../shared/lib/cn';
import { useStartSprint } from '../hooks/useSprintMutations';
import { isoDateOffset } from '../lib/sprintUtils';

const startSprintSchema = z
  .object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

type StartSprintValues = z.infer<typeof startSprintSchema>;

interface StartSprintDialogProps {
  open: boolean;
  onClose: () => void;
  sprint: Sprint;
  projectId: string;
  /** Called with the started sprint so the parent can navigate to /board. */
  onStarted: (sprint: Sprint) => void;
  /** True when another sprint is already active — disables the action. */
  hasActiveSprint: boolean;
  /** The active sprint name (for the "another sprint is active" message). */
  activeSprintName?: string;
}


export function StartSprintDialog({
  open,
  onClose,
  sprint,
  projectId,
  onStarted,
  hasActiveSprint,
  activeSprintName,
}: StartSprintDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Start "${sprint.name}"`}
      description="Set the sprint dates to begin tracking work."
      size="sm"
    >
      <StartSprintForm
        key={sprint.id}
        sprint={sprint}
        projectId={projectId}
        onClose={onClose}
        onStarted={onStarted}
        hasActiveSprint={hasActiveSprint}
        activeSprintName={activeSprintName}
      />
    </Modal>
  );
}

function StartSprintForm({
  sprint,
  projectId,
  onClose,
  onStarted,
  hasActiveSprint,
  activeSprintName,
}: Omit<StartSprintDialogProps, 'open'>) {
  const startSprint = useStartSprint(projectId);
  const [formError, setFormError] = useState<string | null>(null);

  const today = isoDateOffset(0);
  const defaultEnd = isoDateOffset(14);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StartSprintValues>({
    resolver: zodResolver(startSprintSchema),
    defaultValues: {
      startDate: sprint.startDate ?? today,
      endDate: sprint.endDate ?? defaultEnd,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const started = await startSprint.mutateAsync({
        sprintId: sprint.id,
        startDate: values.startDate,
        endDate: values.endDate,
      });
      onStarted(started);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const serverErrors = fieldErrors(err);
        if (Object.keys(serverErrors).length > 0) {
          for (const [field, message] of Object.entries(serverErrors)) {
            if (field === 'startDate' || field === 'endDate') {
              setError(field, { message });
            }
          }
          return;
        }
        // 409 = another sprint already active.
        setFormError(
          err.status === 409
            ? 'Another sprint is already active. Complete it before starting a new one.'
            : getErrorMessage(err),
        );
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {hasActiveSprint && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <strong>{activeSprintName ?? 'A sprint'}</strong> is already active. Complete
            it before starting another sprint.
          </span>
        </div>
      )}

      {formError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid gap-x-4 sm:grid-cols-2">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-800 mb-1.5">
            Start date
          </label>
          <input
            type="date"
            aria-invalid={!!errors.startDate}
            disabled={hasActiveSprint}
            className={dateClass(!!errors.startDate, hasActiveSprint)}
            {...register('startDate')}
          />
          {errors.startDate && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
              {errors.startDate.message}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-800 mb-1.5">
            End date
          </label>
          <input
            type="date"
            aria-invalid={!!errors.endDate}
            disabled={hasActiveSprint}
            className={dateClass(!!errors.endDate, hasActiveSprint)}
            {...register('endDate')}
          />
          {errors.endDate && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
              {errors.endDate.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          loadingText="Starting…"
          disabled={hasActiveSprint}
        >
          Start sprint
        </Button>
      </div>
    </form>
  );
}

function dateClass(hasError: boolean, disabled: boolean): string {
  return cn(
    'w-full rounded-lg border bg-white text-slate-900 text-sm px-3 py-2.5 cursor-pointer',
    'focus:outline-none focus:ring-2 transition-colors',
    disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed',
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-300 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20',
  );
}
