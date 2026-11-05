import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { Spinner } from './Spinner';
const buttonVariants = {
  primary:
    'bg-[#2f4bff] hover:bg-[#253ecc] active:bg-[#1f35b2] text-white shadow-sm hover:shadow',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm',
  'danger-ghost': 'text-red-600 hover:bg-red-50 active:bg-red-100',
} as const;

const buttonSizes = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
  icon: 'h-9 w-9 rounded-lg',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

const base =
  'inline-flex items-center justify-center font-semibold transition-all duration-150 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer min-w-0 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff] focus-visible:ring-offset-2';

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
      {busy && <Spinner className={cn(size === 'sm' ? 'h-3.5 w-7' : 'h-4 w-4')} />}
      <span className="truncate">{busy && loadingText ? loadingText : children}</span>
    </button>
  );
}
