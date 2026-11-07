import { useState } from 'react';
import type { Sprint } from '../../../types/api';
import { getErrorMessage } from '../../../lib/api-error';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { SparklesIcon, AlertTriangleIcon } from '../../../shared/components/icons';
import { useCompleteSprint, useGenerateSprintSummary } from '../hooks/useSprintMutations';
import { unfinishedCount, unfinishedPoints } from '../lib/sprintUtils';

interface CompleteSprintDialogProps {
  open: boolean;
  onClose: () => void;
  sprint: Sprint;
  projectId: string;
  /** Planned sprints available as destinations for unfinished todos. */
  plannedSprints: Sprint[];
  /** Called after successful completion so the parent can navigate. */
  onCompleted: (completedSprint: Sprint) => void;
}

/**
 * SPR-6: Complete the active sprint.
 *
 * Shows the summary (done/unfinished counts), asks where to move unfinished
 * todos, and optionally generates an AI summary after the sprint is completed.
 *
 * AI summary (AI-4) is called *after* completion and its failure is isolated —
 * a failed AI call does not undo or re-show the sprint as incomplete.
 */
export function CompleteSprintDialog({
  open,
  onClose,
  sprint,
  projectId,
  plannedSprints,
  onCompleted,
}: CompleteSprintDialogProps) {
  const completeSprint = useCompleteSprint(projectId);
  const generateSummary = useGenerateSprintSummary(projectId);

  const [moveUnfinishedTo, setMoveUnfinishedTo] = useState<string>('backlog');
  const [generateAI, setGenerateAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const stats = sprint.stats;
  const unfinished = unfinishedCount(stats);
  const unfinishedPts = unfinishedPoints(stats);

  const handleComplete = async () => {
    setFormError(null);
    setAiError(null);

    try {
      const completed = await completeSprint.mutateAsync({
        sprintId: sprint.id,
        body: { moveUnfinishedTo },
      });

      // AI summary is optional and its failure must not block the success flow.
      if (generateAI) {
        try {
          await generateSummary.mutateAsync(completed.id);
        } catch (aiErr) {
          setAiError(getErrorMessage(aiErr));
          // Sprint is already completed — call onCompleted regardless.
        }
      }

      onCompleted(completed);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  const isPending = completeSprint.isPending || generateSummary.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Complete "${sprint.name}"`}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            loading={isPending}
            loadingText={generateSummary.isPending ? 'Generating summary…' : 'Completing…'}
          >
            Complete sprint
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          >
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{formError}</span>
          </div>
        )}

        {aiError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
          >
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Sprint completed, but AI summary failed: {aiError}. You can generate it
              later from Sprint History.
            </span>
          </div>
        )}

        {/* Sprint summary */}
        <div className="rounded-xl border border-kanbot-border bg-kanbot-surface-elevated p-4 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface-elevated">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-kanbot-muted dark:text-kanbot-dark-muted">
            Sprint summary
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Done" value={stats.doneTodos} of={stats.totalTodos} unit="todos" />
            <Stat label="Done pts" value={stats.donePoints} of={stats.totalPoints} unit="pts" />
            <Stat label="Unfinished" value={unfinished} unit="todos" />
            <Stat label="Unfinished pts" value={unfinishedPts} unit="pts" />
          </div>
        </div>

        {/* Where to send unfinished todos */}
        {unfinished > 0 && (
          <div>
            <label htmlFor="complete-sprint-destination" className="mb-1.5 block text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text">
              Move {unfinished} unfinished {unfinished === 1 ? 'todo' : 'todos'} to
            </label>
            <select
              id="complete-sprint-destination"
              value={moveUnfinishedTo}
              onChange={(e) => setMoveUnfinishedTo(e.target.value)}
              disabled={isPending}
              className="w-full cursor-pointer rounded-lg border border-kanbot-border bg-kanbot-surface px-3 py-2.5 text-sm text-kanbot-text focus:border-kanbot-primary focus:outline-none focus:ring-2 focus:ring-kanbot-primary/20 disabled:opacity-60 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text"
            >
              <option value="backlog">Backlog</option>
              {plannedSprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {unfinished === 0 && (
          <p className="text-kanbot-muted dark:text-kanbot-dark-muted">
            🎉 All todos are done! This sprint is ready to be completed.
          </p>
        )}

        {/* AI summary option */}
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-kanbot-border p-3 hover:bg-kanbot-surface-elevated dark:border-kanbot-dark-border dark:hover:bg-kanbot-dark-surface-elevated">
          <input
            type="checkbox"
            checked={generateAI}
            onChange={(e) => setGenerateAI(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-kanbot-border accent-kanbot-primary dark:border-kanbot-dark-border"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <SparklesIcon className="h-4 w-4 text-kanbot-primary" />
              <span className="font-medium text-kanbot-text dark:text-kanbot-dark-text">Generate AI summary</span>
            </div>
            <p className="mt-0.5 text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
              After completing the sprint, the AI will write a short retrospective summary.
            </p>
          </div>
        </label>
      </div>
    </Modal>
  );
}

function Stat({
  label,
  value,
  of: total,
  unit,
}: {
  label: string;
  value: number;
  of?: number;
  unit: string;
}) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-kanbot-text dark:text-kanbot-dark-text">
        {value}
        {total !== undefined && (
          <span className="text-sm font-normal text-kanbot-muted dark:text-kanbot-dark-muted">/{total}</span>
        )}
      </p>
      <p className="text-[11px] text-kanbot-muted dark:text-kanbot-dark-muted">
        {label} {unit}
      </p>
    </div>
  );
}
