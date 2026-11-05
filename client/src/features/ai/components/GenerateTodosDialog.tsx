import { useState } from 'react';
import type { DraftTodo, TodoPriority, TodoType, StoryPoints } from '../../../types/api';
import { TODO_TYPES, TODO_PRIORITIES, STORY_POINTS } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import {AlertTriangleIcon,SparklesIcon,} from '../../../shared/components/icons';
import { TypeIcon } from '../../../shared/components/TypeIcon';
import { useGenerateTodos, useSaveDraftTodos } from '../hooks/useAiMutations';
import { getErrorMessage } from '../../../lib/api-error';
interface GenerateTodosDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}
export function GenerateTodosDialog({
  open,
  onClose,
  projectId,
}: GenerateTodosDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Todos"
      description="Describe a feature and AI will suggest a list of todos."
      size="lg"
    >
      {/* key resets the form/drafts whenever the dialog reopens */}
      <GenerateTodosForm
        key={open ? 'open' : 'closed'}
        projectId={projectId}
        onClose={onClose}
      />
    </Modal>
  );
}

// ─── Editable draft item ──────────────────────────────────────────────────────

interface EditableDraft extends DraftTodo {
  selected: boolean;
}

function GenerateTodosForm({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(5);
  const [drafts, setDrafts] = useState<EditableDraft[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const generate = useGenerateTodos(projectId);
  const save = useSaveDraftTodos(projectId);

  const selectedCount = drafts.filter((d) => d.selected).length;
  const promptTooShort = prompt.trim().length < 3;

  const handleGenerate = async () => {
    if (promptTooShort) return;
    setSaveError(null);
    try {
      const result = await generate.mutateAsync({ prompt: prompt.trim(), count });
      setDrafts(result.todos.map((t) => ({ ...t, selected: true })));
    } catch {
      // error displayed via generate.error
    }
  };

  const handleSave = async () => {
    const selected = drafts.filter((d) => d.selected);
    if (!selected.length) return;
    setSaveError(null);
    try {
      await save.mutateAsync({
        todos: selected.map(({ title, description, type, priority, storyPoints }) => ({
          title,
          description,
          type,
          priority,
          storyPoints,
        })),
      });
      setSaved(true);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  };

  const updateDraft = (index: number, patch: Partial<EditableDraft>) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    );
  };

  // ── Step 1: Prompt form ──────────────────────────────────────────────────
  if (drafts.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1.5">
            Feature description <span className="text-red-500">*</span>
          </label>
          <textarea
            autoFocus
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a feature, e.g. 'User profile page with avatar upload and social links'"
            disabled={generate.isPending}
            aria-label="Feature description"
            className={cn(
              'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm',
              'placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-y',
              'border-slate-300 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20',
              generate.isPending && 'opacity-60',
            )}
          />
          <p className="mt-1 text-[11px] text-slate-400">3–2000 characters.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1.5">
            Number of todos
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))
            }
            disabled={generate.isPending}
            aria-label="Number of todos to generate"
            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20"
          />
          <p className="mt-1 text-[11px] text-slate-400">1–10 todos.</p>
        </div>

        {generate.isError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{getErrorMessage(generate.error)}</span>
          </div>
        )}

        <p className="text-[11px] text-slate-400">
          AI can make mistakes. Review before saving.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={generate.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleGenerate()}
            loading={generate.isPending}
            loadingText="Generating…"
            disabled={promptTooShort}
          >
            <SparklesIcon className="h-4 w-4" />
            Generate
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 2: Draft review ─────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Review and edit the suggestions. Uncheck any you don&apos;t want.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setDrafts([]); generate.reset(); }}
        >
          ← Back
        </Button>
      </div>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1" data-lenis-prevent>
        {drafts.map((draft, i) => (
          <DraftRow
            key={i}
            draft={draft}
            index={i}
            onChange={updateDraft}
          />
        ))}
      </div>

      {saveError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>{saveError}</span>
        </div>
      )}

      {saved && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 text-center">
          ✓ Added {selectedCount} {selectedCount === 1 ? 'todo' : 'todos'} to the backlog!
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        AI can make mistakes. Review before saving.
      </p>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">
          {selectedCount} of {drafts.length} selected
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            loading={save.isPending}
            loadingText="Adding…"
            disabled={selectedCount === 0 || saved}
          >
            Add {selectedCount > 0 ? selectedCount : ''} to backlog
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Single draft row ─────────────────────────────────────────────────────────

const TYPE_LABELS: Record<TodoType, string> = {
  task: 'Task', story: 'Story', bug: 'Bug',
};
const PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};

function DraftRow({
  draft,
  index,
  onChange,
}: {
  draft: EditableDraft;
  index: number;
  onChange: (i: number, patch: Partial<EditableDraft>) => void;
}) {

  return (
    <div
      className={cn(
        'rounded-xl border p-3 transition-colors',
        draft.selected ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={draft.selected}
          onChange={(e) => onChange(index, { selected: e.target.checked })}
          aria-label={`Select "${draft.title}"`}
          className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#2f4bff]"
        />

        <div className="min-w-0 flex-1 space-y-2">
          {/* Editable title */}
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onChange(index, { title: e.target.value })}
            disabled={!draft.selected}
            aria-label="Todo title"
            className="w-full rounded-lg border border-slate-200 bg-transparent px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2f4bff]/30 disabled:opacity-60"
          />

          {/* Metadata row */}
          <div className="flex flex-wrap gap-2">
            {/* Type */}
            <select
              value={draft.type}
              onChange={(e) => onChange(index, { type: e.target.value as TodoType })}
              disabled={!draft.selected}
              aria-label="Type"
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#2f4bff]/20 disabled:opacity-60"
            >
              {(TODO_TYPES as readonly TodoType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>

            {/* Priority */}
            <select
              value={draft.priority}
              onChange={(e) => onChange(index, { priority: e.target.value as TodoPriority })}
              disabled={!draft.selected}
              aria-label="Priority"
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#2f4bff]/20 disabled:opacity-60"
            >
              {(TODO_PRIORITIES as readonly TodoPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>

            {/* Story points */}
            <select
              value={draft.storyPoints ?? ''}
              onChange={(e) =>
                onChange(index, {
                  storyPoints: e.target.value === '' ? null : (Number(e.target.value) as StoryPoints),
                })
              }
              disabled={!draft.selected}
              aria-label="Story points"
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#2f4bff]/20 disabled:opacity-60"
            >
              <option value="">– pts</option>
              {STORY_POINTS.map((p) => (
                <option key={p} value={p}>{p} pt{p === 1 ? '' : 's'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Type icon */}
        <TypeIcon type={draft.type} size="h-4 w-4" className="mt-1 shrink-0" />
      </div>
    </div>
  );
}
