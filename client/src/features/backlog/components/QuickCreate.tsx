import { useRef, useState } from 'react';
import { cn } from '../../../shared/lib/cn';
import { Spinner } from '../../../shared/components/Spinner';
import { PlusIcon } from '../../../shared/components/icons';
import { useCreateTodo } from '../hooks/useTodoMutations';
import { getErrorMessage } from '../../../lib/api-error';

interface QuickCreateProps {
  projectId: string;
}
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
          'flex items-center gap-2 rounded-full border border-dashed px-5 py-3 transition-colors',
          focused
            ? 'border-solid border-kanbot-primary bg-kanbot-surface ring-2 ring-kanbot-primary/20 dark:border-kanbot-dark-primary dark:bg-kanbot-dark-surface dark:ring-kanbot-dark-primary/25'
            : 'border-kanbot-border bg-kanbot-surface hover:border-kanbot-primary/40 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:hover:border-kanbot-primary/40',
        )}
      >
        {createTodo.isPending ? (
          <Spinner className="h-4 w-4 shrink-0 text-kanbot-primary" />
        ) : (
          <PlusIcon
            className="h-4 w-4 shrink-0 text-kanbot-muted dark:text-kanbot-dark-muted"
            aria-hidden="true"
          />
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder="Add a task to your backlog... (press Enter to create)"
          disabled={createTodo.isPending}
          aria-label="New todo title"
          className="flex-1 bg-transparent text-sm text-kanbot-text placeholder:text-kanbot-muted focus:outline-none disabled:opacity-50 dark:text-kanbot-dark-text dark:placeholder:text-kanbot-dark-muted"
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
        <p role="alert" className="mt-1 px-1 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
