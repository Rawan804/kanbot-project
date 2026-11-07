import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { Spinner } from './Spinner';

const buttonVariants = {
  primary:
    'bg-kanbot-primary hover:bg-kanbot-primary-hover active:bg-kanbot-primary-active text-white dark:text-kanbot-dark-background shadow-sm hover:shadow',
  secondary:
    'bg-kanbot-surface text-kanbot-text border border-kanbot-border hover:bg-kanbot-surface-elevated active:bg-kanbot-surface-elevated dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text dark:border-kanbot-dark-border dark:hover:bg-kanbot-dark-surface-elevated dark:active:bg-kanbot-dark-surface-elevated',
  ghost:
    'text-kanbot-muted hover:bg-kanbot-surface-elevated hover:text-kanbot-text dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text',
  danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm',
  'danger-ghost': 'text-red-600 hover:bg-red-50 active:bg-red-100 dark:hover:bg-red-950/30 dark:active:bg-red-950/40',
} as const;

const buttonSizes = {
  sm: 'h-8 px-3.5 text-xs gap-1.5 rounded-full',
  md: 'h-10 px-5 text-sm gap-2 rounded-full',
  lg: 'h-11 px-6 text-sm gap-2 rounded-full',
  icon: 'h-9 w-9 rounded-lg',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

const base =
  'inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer min-w-0 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-kanbot-dark-surface';

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
