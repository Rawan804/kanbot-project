import type { TodoStatus } from '../../types/api';
import { cn } from '../lib/cn';

export const STATUS_LABELS: Record<TodoStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
};

/** Tone + dot per status. Shared by the backlog cards and the board columns so colours always match. */
export const STATUS_TONES: Record<TodoStatus, 'sky' | 'lav' | 'rose' | 'sage'> = {
  todo: 'sky',
  in_progress: 'lav',
  in_review: 'rose',
  done: 'sage',
};

export function StatusBadge({ status, className }: { status: TodoStatus; className?: string }) {
  const tone = STATUS_TONES[status];
  return (
    <span className={cn('kb-pill', `kb-tone-${tone}`, className)}>
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', `kb-dot-${tone}`)} />
      {STATUS_LABELS[status]}
    </span>
  );
}
