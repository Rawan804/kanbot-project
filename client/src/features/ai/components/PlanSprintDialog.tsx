import { useMemo, useState } from 'react';
import type { PlanSprintResponse, StoryPoints } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { AlertTriangleIcon,SparklesIcon,} from '../../../shared/components/icons';
import { PointsBadge } from '../../../shared/components/PointsSelect';
import { usePlanSprint, useCreateSprintFromPlan } from '../hooks/useAiMutations';
import { useTodos } from '../../backlog/hooks/useTodos';
import { getErrorMessage } from '../../../lib/api-error';

interface PlanSprintDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}
export function PlanSprintDialog({
  open,
  onClose,
  projectId,
}: PlanSprintDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Plan Sprint"
      description="Let AI suggest a sprint plan based on your backlog."
      size="lg"
    >
      <PlanSprintForm
        key={open ? 'open' : 'closed'}
        projectId={projectId}
        onClose={onClose}
      />
    </Modal>
  );
}

function PlanSprintForm({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [capacity, setCapacity] = useState(20);
  const [focus, setFocus] = useState('');
  const [plan, setPlan] = useState<PlanSprintResponse | null>(null);
  // Checked todo ids — initialised from the plan's suggestion.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Editable goal.
  const [editableGoal, setEditableGoal] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const suggest = usePlanSprint(projectId);
  const createSprint = useCreateSprintFromPlan(projectId);

  // We need the full backlog to resolve todoId → todo object (for title + points).
  const { data: backlogTodos } = useTodos(projectId, { sprintId: 'backlog' });

  const handleSuggest = async () => {
    if (capacity < 1 || capacity > 200) return;
    setCreateError(null);
    try {
      const result = await suggest.mutateAsync({
        capacity,
        focus: focus.trim() || undefined,
      });
      setPlan(result);
      setSelectedIds(new Set(result.todoIds));
      setEditableGoal(result.goal);
    } catch {
      // error shown via suggest.error
    }
  };

  // Running total of story points for the currently selected todos.
  const selectedPoints = useMemo(() => {
    if (!backlogTodos || !plan) return 0;
    return Array.from(selectedIds).reduce((sum, id) => {
      const todo = backlogTodos.find((t) => t.id === id);
      return sum + (todo?.storyPoints ?? 0);
    }, 0);
  }, [selectedIds, backlogTodos, plan]);

  const handleCreate = async () => {
    if (!plan) return;
    setCreateError(null);
    try {
      await createSprint.mutateAsync({
        goal: editableGoal.trim() || undefined,
        todoIds: Array.from(selectedIds),
      });
      setCreated(true);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setCreateError(getErrorMessage(err));
    }
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // ── Step 1: Input form ───────────────────────────────────────────────────
  if (!plan) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1.5">
            Sprint capacity (story points) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={200}
            autoFocus
            value={capacity}
            onChange={(e) =>
              setCapacity(Math.max(1, Math.min(200, parseInt(e.target.value) || 20)))
            }
            disabled={suggest.isPending}
            aria-label="Sprint capacity in story points"
            className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20"
          />
          <p className="mt-1 text-[11px] text-slate-400">1–200 story points.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1.5">
            Focus / theme <span className="text-xs text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. 'Authentication and user profiles'"
            disabled={suggest.isPending}
            maxLength={300}
            aria-label="Sprint focus or theme"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20"
          />
        </div>

        {suggest.isError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{getErrorMessage(suggest.error)}</span>
          </div>
        )}

        <p className="text-[11px] text-slate-400">
          AI can make mistakes. Review before saving.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={suggest.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSuggest()}
            loading={suggest.isPending}
            loadingText="Planning…"
            disabled={capacity < 1 || capacity > 200}
          >
            <SparklesIcon className="h-4 w-4" />
            Suggest plan
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 2: Review suggestion ────────────────────────────────────────────
  const overCapacity = selectedPoints > capacity;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Review the AI suggestion and adjust your selection.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setPlan(null); suggest.reset(); }}
        >
          ← Back
        </Button>
      </div>

      {/* Editable goal */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
          Suggested goal
        </label>
        <input
          type="text"
          value={editableGoal}
          onChange={(e) => setEditableGoal(e.target.value)}
          maxLength={300}
          aria-label="Sprint goal"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20"
        />
      </div>

      {/* Points indicator */}
      <div
        className={cn(
          'flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-medium',
          overCapacity
            ? 'border-red-200 bg-red-50 text-red-700'
            : selectedPoints === capacity
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-slate-200 bg-slate-50 text-slate-600',
        )}
      >
        <span>Selected story points</span>
        <span>
          {selectedPoints} / {capacity}
          {overCapacity && ' — over capacity!'}
          {selectedPoints === capacity && ' ✓'}
        </span>
      </div>

      {/* Todo list */}
      <div className="max-h-[40vh] overflow-y-auto space-y-1.5 pr-1" data-lenis-prevent>
        {plan.todoIds.map((id) => {
          const todo = backlogTodos?.find((t) => t.id === id);
          const checked = selectedIds.has(id);
          return (
            <label
              key={id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                checked
                  ? 'border-slate-200 bg-white'
                  : 'border-slate-100 bg-slate-50 opacity-60',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleId(id)}
                className="h-4 w-4 rounded border-slate-300 accent-[#2f4bff]"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                {todo?.title ?? id}
              </span>
              {todo && (
                <PointsBadge points={todo.storyPoints as StoryPoints | null} />
              )}
            </label>
          );
        })}
        {plan.todoIds.length === 0 && (
          <p className="py-4 text-center text-xs text-slate-400">
            No backlog todos matched the suggested plan.
          </p>
        )}
      </div>

      {/* AI reasoning */}
      {plan.reasoning && (
        <details className="rounded-xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700">
            AI reasoning
          </summary>
          <p className="px-3 pb-3 pt-1 text-xs leading-relaxed text-slate-500">
            {plan.reasoning}
          </p>
        </details>
      )}

      {createError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>{createError}</span>
        </div>
      )}

      {created && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 text-center">
          ✓ Sprint created with {selectedIds.size} todo{selectedIds.size === 1 ? '' : 's'}!
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        AI can make mistakes. Review before saving.
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={createSprint.isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleCreate()}
          loading={createSprint.isPending}
          loadingText="Creating…"
          disabled={selectedIds.size === 0 || created || overCapacity}
        >
          Create sprint with {selectedIds.size > 0 ? selectedIds.size : ''} todo
          {selectedIds.size === 1 ? '' : 's'}
        </Button>
      </div>
    </div>
  );
}
