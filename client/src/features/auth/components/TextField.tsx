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
        className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`w-full rounded-lg border bg-white dark:bg-[#131a30] text-slate-900 dark:text-slate-100 text-base sm:text-sm px-3.5 py-2.5 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500 disabled:cursor-not-allowed ${
            trailing ? 'pr-16' : ''
          } ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-[#d6dbe8] dark:border-[#2a3556] focus:border-[#2f4bff] focus:ring-[#2f4bff]/20'
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
        <p id={hintId} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

