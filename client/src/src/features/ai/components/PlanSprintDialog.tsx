import { useMemo, useState } from 'react';
import type { PlanSprintResponse, StoryPoints } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { AlertTriangleIcon,SparklesIcon,} from '../../../shared/components/icons';
import { PointsBadge } from '../../../shared/components/PointsSelect';
import { usePlanSprint, useCreateSprintFromPlan } from '../hooks/useAiMutations';
import { useTodos } from '../../backlog/hooks/useTodos';
import { getErrorMessage } from '../../../lib/api-error';
import { SPRINT_TEMPLATES } from '../../sprints/lib/sprintTemplates';

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
  const [selectedTemplate, setSelectedTemplate] = useState('');
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
  const {
    data: backlogTodos,
    isLoading: backlogLoading,
    isError: backlogError,
    error: backlogErr,
    refetch: refetchBacklog,
  } = useTodos(projectId, { sprintId: 'backlog' });

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
          <label className="mb-1.5 block text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text">
            Sprint capacity (story points) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={200}
            autoFocus
            data-autofocus=""
            value={capacity}
            onChange={(e) => {
              setSelectedTemplate('');
              setCapacity(Math.max(1, Math.min(200, parseInt(e.target.value) || 20)));
            }}
            disabled={suggest.isPending}
            aria-label="Sprint capacity in story points"
            className="w-32 rounded-lg border border-kanbot-border bg-kanbot-surface px-3 py-2.5 text-sm text-kanbot-text focus:border-kanbot-primary focus:outline-none focus:ring-2 focus:ring-kanbot-primary/20 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text"
          />
          <p className="mt-1 text-[11px] text-kanbot-muted dark:text-kanbot-dark-muted">1–200 story points.</p>
          <label className="mt-3 block text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text" htmlFor="capacity-template">
            Capacity template
          </label>
          <select
            id="capacity-template"
            value={selectedTemplate}
            onChange={(event) => {
              setSelectedTemplate(event.target.value);
              const template = SPRINT_TEMPLATES.find((item) => item.id === event.target.value);
              if (template) setCapacity(template.capacity);
            }}
            className="mt-1 w-full rounded-lg border border-kanbot-border bg-kanbot-surface px-3 py-2.5 text-sm text-kanbot-text focus:outline-none focus:ring-2 focus:ring-kanbot-primary/20 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text"
          >
            <option value="">Custom capacity</option>
            {SPRINT_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.capacity} points
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text">
            Focus / theme <span className="text-xs text-kanbot-muted dark:text-kanbot-dark-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. 'Authentication and user profiles'"
            disabled={suggest.isPending}
            maxLength={300}
            aria-label="Sprint focus or theme"
            className="w-full rounded-lg border border-kanbot-border bg-kanbot-surface px-3.5 py-2.5 text-sm text-kanbot-text placeholder:text-kanbot-muted focus:border-kanbot-primary focus:outline-none focus:ring-2 focus:ring-kanbot-primary/20 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text dark:placeholder:text-kanbot-dark-muted"
          />
        </div>

        {suggest.isError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          >
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{getErrorMessage(suggest.error)}</span>
          </div>
        )}

        {backlogLoading && (
          <div role="status" className="flex items-center gap-2 text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
            <Spinner className="h-4 w-4 text-kanbot-primary" />
            Loading backlog…
          </div>
        )}
        {backlogError && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          >
            <span>Couldn't load backlog: {getErrorMessage(backlogErr)}</span>
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto"
              onClick={() => refetchBacklog()}
            >
              Retry
            </Button>
          </div>
        )}

        <p className="text-[11px] text-kanbot-muted dark:text-kanbot-dark-muted">
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
            disabled={capacity < 1 || capacity > 200 || backlogLoading || backlogError}
          >
            <SparklesIcon className="h-4 w-4" />
            {suggest.isError ? 'Retry plan' : 'Suggest plan'}
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
        <p className="text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
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
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-kanbot-muted dark:text-kanbot-dark-muted">
          Suggested goal
        </label>
        <input
          type="text"
          value={editableGoal}
          onChange={(e) => setEditableGoal(e.target.value)}
          maxLength={300}
          aria-label="Sprint goal"
          className="w-full rounded-lg border border-kanbot-border bg-kanbot-surface px-3 py-2 text-sm text-kanbot-text focus:border-kanbot-primary focus:outline-none focus:ring-2 focus:ring-kanbot-primary/20 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text"
        />
      </div>

      {/* Points indicator */}
      <div
        className={cn(
          'flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-medium',
          overCapacity
            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400'
            : selectedPoints === capacity
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400'
              : 'border-kanbot-border bg-kanbot-surface-elevated text-kanbot-muted dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:text-kanbot-dark-muted',
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
        {backlogLoading && (
          <div role="status" className="flex items-center justify-center gap-2 py-4 text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
            <Spinner className="h-4 w-4 text-kanbot-primary" />
            Loading backlog…
          </div>
        )}
        {backlogError && (
          <div role="alert" className="flex items-center justify-between gap-2 py-3 text-xs text-red-700 dark:text-red-400">
            <span>Couldn't load backlog: {getErrorMessage(backlogErr)}</span>
            <Button variant="secondary" size="sm" onClick={() => refetchBacklog()}>
              Retry
            </Button>
          </div>
        )}
        {!backlogLoading && !backlogError && plan.todoIds.map((id) => {
          const todo = backlogTodos?.find((t) => t.id === id);
          const checked = selectedIds.has(id);
          return (
            <label
              key={id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                checked
                  ? 'border-kanbot-border bg-kanbot-surface dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface'
                  : 'border-kanbot-border bg-kanbot-surface-elevated opacity-60 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface-elevated',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleId(id)}
                className="h-4 w-4 rounded border-kanbot-border accent-kanbot-primary dark:border-kanbot-dark-border"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-kanbot-text dark:text-kanbot-dark-text">
                {todo?.title ?? id}
              </span>
              {todo && (
                <PointsBadge points={todo.storyPoints as StoryPoints | null} />
              )}
            </label>
          );
        })}
        {!backlogLoading && !backlogError && plan.todoIds.length === 0 && (
          <p className="py-4 text-center text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
            No backlog todos matched the suggested plan.
          </p>
        )}
      </div>

      {/* AI reasoning */}
      {plan.reasoning && (
        <details className="rounded-xl border border-kanbot-border bg-kanbot-surface-elevated dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface-elevated">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-kanbot-muted hover:text-kanbot-text dark:text-kanbot-dark-muted dark:hover:text-kanbot-dark-text">
            AI reasoning
          </summary>
          <p className="px-3 pb-3 pt-1 text-xs leading-relaxed text-kanbot-muted dark:text-kanbot-dark-muted">
            {plan.reasoning}
          </p>
        </details>
      )}

      {createError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>{createError}</span>
        </div>
      )}

      {created && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400">
          ✓ Sprint created with {selectedIds.size} todo{selectedIds.size === 1 ? '' : 's'}!
        </div>
      )}

      <p className="text-[11px] text-kanbot-muted dark:text-kanbot-dark-muted">
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
          disabled={
            selectedIds.size === 0 ||
            created ||
            overCapacity ||
            backlogLoading ||
            backlogError
          }
        >
          {createSprint.isError
            ? 'Retry creating sprint'
            : `Create sprint with ${selectedIds.size > 0 ? selectedIds.size : ''} todo${selectedIds.size === 1 ? '' : 's'}`}
        </Button>
      </div>
    </div>
  );
}
