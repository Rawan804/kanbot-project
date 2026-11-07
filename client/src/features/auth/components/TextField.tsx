import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
}
export function TextField({ label, error, hint, trailing, className = '', id: customId, ...input }: TextFieldProps) {
  const generatedId = useId();
  const id = customId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`w-full rounded-lg border bg-kanbot-surface px-3.5 py-2.5 text-base text-kanbot-text transition-colors placeholder:text-kanbot-muted focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-kanbot-surface-elevated disabled:text-kanbot-muted dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text dark:placeholder:text-kanbot-dark-muted dark:disabled:bg-kanbot-dark-surface-elevated dark:disabled:text-kanbot-dark-muted sm:text-sm ${
            trailing ? 'pr-16' : ''
          } ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-kanbot-border focus:border-kanbot-primary focus:ring-kanbot-primary/20 dark:border-kanbot-dark-border'
          } ${className}`}
          {...input}
        />
        {trailing && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
            {trailing}
          </div>
        )}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
