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
 
  plannedSprints: Sprint[];

  onCompleted: (completedSprint: Sprint) => void;
}


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

   
      if (generateAI) {
        try {
          await generateSummary.mutateAsync(completed.id);
        } catch (aiErr) {
          setAiError(getErrorMessage(aiErr));
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
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700"
          >
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{formError}</span>
          </div>
        )}

        {aiError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800"
          >
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Sprint completed, but AI summary failed: {aiError}. You can generate it
              later from Sprint History.
            </span>
          </div>
        )}

        {/* Sprint summary */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Move {unfinished} unfinished {unfinished === 1 ? 'todo' : 'todos'} to
            </label>
            <select
              value={moveUnfinishedTo}
              onChange={(e) => setMoveUnfinishedTo(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20 cursor-pointer disabled:opacity-60"
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
          <p className="text-slate-500">
            🎉 All todos are done! This sprint is ready to be completed.
          </p>
        )}

        {/* AI summary option */}
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
          <input
            type="checkbox"
            checked={generateAI}
            onChange={(e) => setGenerateAI(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-slate-300 accent-[#2f4bff]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <SparklesIcon className="h-4 w-4 text-[#2f4bff]" />
              <span className="font-medium text-slate-800">Generate AI summary</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
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
      <p className="text-lg font-bold text-slate-900">
        {value}
        {total !== undefined && (
          <span className="text-sm font-normal text-slate-400">/{total}</span>
        )}
      </p>
      <p className="text-[11px] text-slate-500">
        {label} {unit}
      </p>
    </div>
  );
}
