import { cn } from '../lib/cn';
import { CalendarIcon } from './icons';
import { formatDueDate, getDueDateState, labelColorClass } from './todoIndicatorUtils';

export function LabelChip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        'kb-pill max-w-full truncate font-medium',
        labelColorClass(label),
        className,
      )}
    >
      {label}
    </span>
  );
}

export function TodoDueDate({
  dueDate,
  className,
}: {
  dueDate: string | null;
  className?: string;
}) {
  if (!dueDate) return null;

  const state = getDueDateState(dueDate);
  const label =
    state === 'overdue'
      ? `Overdue · ${formatDueDate(dueDate)}`
      : state === 'today'
        ? 'Due today'
        : `Due ${formatDueDate(dueDate)}`;
  const color =
    state === 'overdue'
      ? 'kb-pill kb-tone-rose'
      : state === 'today'
        ? 'kb-pill kb-tone-sand'
        : state === 'soon'
          ? 'kb-pill kb-tone-lav'
          : 'kb-muted';

  return (
    <time
      dateTime={dueDate}
      title={label}
      className={cn('inline-flex shrink-0 items-center gap-1 text-[11px] font-medium', color, className)}
    >
      <CalendarIcon className="h-3 w-3" aria-hidden="true" />
      {label}
    </time>
  );
}
