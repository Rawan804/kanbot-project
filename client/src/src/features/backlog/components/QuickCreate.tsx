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
 * BL-2 -- Inline "press Enter to create" input at the bottom of the backlog.
 *
 * Defaults: type=task, priority=medium, storyPoints=null (matches spec).
 * Enter to submit, Escape to clear + blur, empty/whitespace rejected.
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
    <div className="mt-3">
      <div
        className={cn(
          'flex items-center gap-3 rounded-[1.25rem] px-5 py-3.5 transition-all duration-150',
          focused
            ? 'bg-[color:var(--kb-surface)] shadow-[0_0_0_2px_var(--kb-primary)]'
            : 'bg-[color:var(--kb-soft)] hover:bg-[color:var(--kb-lav-bg)]',
        )}
      >
        {createTodo.isPending ? (
          <Spinner className="h-4 w-4 shrink-0 text-[color:var(--kb-primary)]" />
        ) : (
          <PlusIcon
            className="h-4 w-4 shrink-0 text-[color:var(--kb-muted)]"
            aria-hidden="true"
          />
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder="Add a task to your backlog and press Enter"
          disabled={createTodo.isPending}
          aria-label="New todo title"
          className="flex-1 bg-transparent text-sm text-[color:var(--kb-text)] placeholder:text-[color:var(--kb-muted)] focus:outline-none disabled:opacity-50"
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
        <p role="alert" className="mt-1.5 px-1 text-xs font-medium text-[color:var(--kb-rose-fg)]">
          {error}
        </p>
      )}
    </div>
  );
}
