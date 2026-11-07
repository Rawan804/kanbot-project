import { STORY_POINTS, type StoryPoints } from '../../types/api';
import { cn } from '../lib/cn';

/**
 * Story-point picker. Renders the Fibonacci sequence (1, 2, 3, 5, 8, 13) as
 * a row of toggleable chips, plus a "–" chip for "not estimated".
 *
 * Designed to be used inside forms (controlled via value + onChange) and as
 * a standalone display component (read-only).
 */

interface PointsSelectProps {
  value: StoryPoints | null;
  onChange?: (points: StoryPoints | null) => void;
  readOnly?: boolean;
  className?: string;
}

export function PointsSelect({ value, onChange, readOnly = false, className }: PointsSelectProps) {
  const options: (StoryPoints | null)[] = [null, ...STORY_POINTS];

  return (
    <div
      className={cn('flex flex-wrap gap-1', className)}
      role={readOnly ? undefined : 'group'}
      aria-label={readOnly ? undefined : 'Story points'}
    >
      {options.map((pt) => {
        const selected = value === pt;
        const label = pt === null ? '–' : String(pt);
        return (
          <button
            key={label}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(pt)}
            aria-pressed={selected}
            aria-label={pt === null ? 'No estimate' : `${pt} point${pt === 1 ? '' : 's'}`}
            className={cn(
              'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary',
              readOnly && 'cursor-default',
              selected
                ? 'bg-[color:var(--kb-primary)] text-[color:var(--kb-on-primary)]'
                : 'bg-[color:var(--kb-soft)] text-[color:var(--kb-muted)] hover:bg-[color:var(--kb-lav-bg)] hover:text-[color:var(--kb-lav-fg)]',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Compact inline display of story points (read-only, for todo rows). */
export function PointsBadge({ points }: { points: StoryPoints | null }) {
  if (points === null) return null;
  return (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-kanbot-surface-elevated px-1 text-[11px] font-semibold text-kanbot-muted dark:bg-kanbot-dark-surface-elevated dark:text-kanbot-dark-muted"
      title={`${points} story point${points === 1 ? '' : 's'}`}
      aria-label={`${points} point${points === 1 ? '' : 's'}`}
    >
      {points}
    </span>
  );
}
