import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Call-to-action, e.g. a "Create project" button. */
  action?: ReactNode;
  tone?: 'empty' | 'error';
  className?: string;
}

/**
 * Reusable empty/error placeholder. Used by the projects list (empty + error
 * states) and the placeholder pages so the look stays consistent.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'empty',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'mb-4 flex h-14 w-14 items-center justify-center rounded-full',
            tone === 'error'
              ? 'bg-red-50 text-red-500'
              : 'bg-[#eef1ff] text-[#2f4bff]',
          )}
        >
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
