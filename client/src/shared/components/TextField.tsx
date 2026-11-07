import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from '../lib/cn';

/**
 * Labeled text input. Designed to spread React Hook Form's `register()` return
 * value (`name`, `onChange`, `onBlur`, `ref`).
 * Fully theme-aware with dark: variants.
 */
export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  error,
  hint,
  trailing,
  className = '',
  id: customId,
  ref,
  autoFocus: autoFocusInput = false,
  ...input
}: TextFieldProps) {
  const generatedId = useId();
  const id = customId ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[color:var(--kb-text)]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          autoFocus={autoFocusInput}
          data-autofocus={autoFocusInput ? '' : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-2xl border px-4 py-2.5 text-base sm:text-sm',
            'bg-[color:var(--kb-surface)] text-[color:var(--kb-text)] placeholder:text-[color:var(--kb-muted)]',
            'transition-colors focus:outline-none focus:ring-2',
            'disabled:cursor-not-allowed disabled:bg-[color:var(--kb-soft)] disabled:text-[color:var(--kb-muted)]',
            trailing ? 'pr-16' : '',
            error
              ? 'border-[color:var(--kb-rose-dot)] focus:border-[color:var(--kb-rose-dot)] focus:ring-[color:var(--kb-rose-dot)]/40'
              : 'border-[color:var(--kb-line)] focus:border-[color:var(--kb-primary)] focus:ring-[color:var(--kb-lav-dot)]/40',
            className,
          )}
          {...input}
        />
        {trailing && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
            {trailing}
          </div>
        )}
      </div>
      {error ? (
        <p
          id={errorId}
          className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-[color:var(--kb-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
