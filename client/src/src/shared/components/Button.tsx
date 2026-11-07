import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { Spinner } from './Spinner';

const buttonVariants = {
  primary:
    'bg-[color:var(--kb-primary)] text-[color:var(--kb-on-primary)] shadow-sm hover:brightness-110 hover:shadow active:brightness-95',
  secondary:
    'bg-[color:var(--kb-surface)] text-[color:var(--kb-text)] shadow-[inset_0_0_0_1px_var(--kb-line)] hover:bg-[color:var(--kb-soft)] active:bg-[color:var(--kb-soft)]',
  ghost:
    'text-[color:var(--kb-muted)] hover:bg-[color:var(--kb-soft)] hover:text-[color:var(--kb-text)]',
  danger: 'bg-[color:var(--kb-rose-fg)] text-[color:var(--kb-surface)] shadow-sm hover:brightness-110',
  'danger-ghost': 'text-[color:var(--kb-rose-fg)] hover:bg-[color:var(--kb-rose-bg)]',
} as const;

const buttonSizes = {
  sm: 'h-8 px-3.5 text-xs gap-1.5 rounded-full',
  md: 'h-10 px-5 text-sm gap-2 rounded-full',
  lg: 'h-11 px-6 text-sm gap-2 rounded-full',
  icon: 'h-9 w-9 rounded-full',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

const base =
  'inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer min-w-0 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kb-bg)]';

function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(base, buttonVariants[variant], buttonSizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const busy = Boolean(loading);
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {busy ? (
        <>
          <Spinner className={cn('shrink-0', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          <span
            className={cn(
              'inline-flex min-w-0 items-center whitespace-nowrap',
              size === 'sm' ? 'gap-1.5' : 'gap-2',
            )}
          >
            {loadingText ?? children}
          </span>
        </>
      ) : (
        <span
          className={cn(
            'inline-flex min-w-0 items-center whitespace-nowrap',
            size === 'sm' ? 'gap-1.5' : 'gap-2',
          )}
        >
          {children}
        </span>
      )}
    </button>
  );
}
