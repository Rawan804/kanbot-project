import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { EmptyArt } from './EmptyArt';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'empty' | 'error';
  /** Show the pastel card illustration instead of the round icon badge. */
  illustration?: boolean;
  className?: string;
}

/**
 * Reusable empty/error state for lists and pages.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'empty',
  illustration = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[1.75rem] px-6 py-14 text-center',
        'bg-[color:var(--kb-surface)] shadow-[inset_0_0_0_1px_var(--kb-line)]',
        className,
      )}
    >
      {illustration ? (
        <EmptyArt className="mb-3 h-32 w-auto" />
      ) : (
        icon && (
          <div
            className={cn(
              'mb-4 flex h-14 w-14 items-center justify-center rounded-full',
              tone === 'error' ? 'kb-tone-rose' : 'kb-tone-lav',
            )}
          >
            {icon}
          </div>
        )
      )}
      <h3 className="text-lg font-semibold tracking-tight text-[color:var(--kb-text)]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[color:var(--kb-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
