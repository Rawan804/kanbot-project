import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from '../lib/cn';

/**
 * Labeled text input. Designed to spread React Hook Form's `register()` return
 * value (`name`, `onChange`, `onBlur`, `ref`): `<TextField label="Name" error={…} {...register('name')} />`.
 * The `ref` is forwarded so RHF can focus the field on error.
 *
 * Styling mirrors the existing auth `TextField` so the two stay visually consistent.
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
  ...input
}: TextFieldProps) {
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
      <div className="relative">
        <input
          id={id}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-lg border bg-white text-slate-900 text-base sm:text-sm px-3.5 py-2.5',
            'transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2',
            'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
            trailing ? 'pr-16' : '',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-300 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20',
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
