import { useId, type TextareaHTMLAttributes, type Ref } from 'react';
import { cn } from '../lib/cn';

/** Labeled multiline input — same accessibility model as `TextField`. */
export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function TextArea({
  label,
  error,
  hint,
  className = '',
  id: customId,
  ref,
  rows = 3,
  ...input
}: TextAreaProps) {
  const generatedId = useId();
  const id = customId ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800 mb-1.5">
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={cn(
          'w-full rounded-lg border bg-white text-slate-900 text-base sm:text-sm px-3.5 py-2.5',
          'transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-y',
          'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-slate-300 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20',
          className,
        )}
        {...input}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
