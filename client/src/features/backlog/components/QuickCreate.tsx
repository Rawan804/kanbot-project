import { useRef, useState } from 'react';
import { cn } from '../../../shared/lib/cn';
import { Spinner } from '../../../shared/components/Spinner';
import { PlusIcon } from '../../../shared/components/icons';
import { useCreateTodo } from '../hooks/useTodoMutations';
import { getErrorMessage } from '../../../lib/api-error';

interface QuickCreateProps {
  projectId: string;
}

/**
 * BL-2 — Inline "press Enter to create" input at the bottom of the backlog.
 *
 * Defaults: type=task, priority=medium, storyPoints=null (matches spec).
 * Enter → submit, Escape → clear + blur, empty/whitespace → rejected.
 * The input stays focused after creation for consecutive entry.
 * A ref guard prevents duplicate in-flight requests.
 */
export function QuickCreate({ projectId }: QuickCreateProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const createTodo = useCreateTodo(projectId);

  const submit = async () => {
    const title = value.trim();
    if (!title) {
      setError('Title cannot be empty.');
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);

    try {
      await createTodo.mutateAsync({
        title,
        type: 'task',
        priority: 'medium',
        storyPoints: null,
      });
      setValue('');
      // Keep focus for consecutive creation.
      inputRef.current?.focus();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <div className="mt-1">
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
          focused
            ? 'border-[#2f4bff] bg-white ring-2 ring-[#2f4bff]/20'
            : 'border-slate-200 bg-white hover:border-slate-300',
        )}
      >
        {createTodo.isPending ? (
          <Spinner className="h-4 w-4 shrink-0 text-[#2f4bff]" />
        ) : (
          <PlusIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder="Add a todo and press Enter…"
          disabled={createTodo.isPending}
          aria-label="New todo title"
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
            if (e.key === 'Escape') {
              setValue('');
              setError(null);
              inputRef.current?.blur();
            }
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600 px-1">
          {error}
        </p>
      )}
    </div>
  );
}
