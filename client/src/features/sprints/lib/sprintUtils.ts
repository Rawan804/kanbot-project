import type { Sprint, SprintStats, TodoStatus } from '../../../types/api';

/**
 * Pure sprint calculation utilities.
 * All functions handle zero-values, null dates, and empty stats safely.
 */
/** Percentage of story points completed (0–100). Returns 0 if totalPoints is 0. */
export function donePointsPercent(stats: SprintStats): number {
  if (stats.totalPoints === 0) return 0;
  return Math.round((stats.donePoints / stats.totalPoints) * 100);
}
/** Percentage of todos marked "done" (0–100). Returns 0 if totalTodos is 0. */
export function doneTodosPercent(stats: SprintStats): number {
  if (stats.totalTodos === 0) return 0;
  return Math.round((stats.doneTodos / stats.totalTodos) * 100);
}

/**
 * Calendar days remaining until `endDate` (inclusive of the end day).
 * Returns null if endDate is absent.
 * Returns 0 if the end date is today or in the past.
 */
export function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/** Total duration of the sprint in calendar days, or null if either date is absent. */
export function sprintDurationDays(
  startDate: string | null,
  endDate: string | null,
): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

/** Todos not yet "done" (for the complete-sprint summary dialog). */
export function unfinishedCount(stats: SprintStats): number {
  return stats.totalTodos - stats.doneTodos;
}

/** Story points of unfinished work (totalPoints minus donePoints). */
export function unfinishedPoints(stats: SprintStats): number {
  return stats.totalPoints - stats.donePoints;
}

/** Count of todos in a specific status column. */
export function countByStatus(stats: SprintStats, status: TodoStatus): number {
  return stats.byStatus[status] ?? 0;
}

/**
 * Format a YYYY-MM-DD date string to a friendly short label.
 * Exported so it can be shared across sprint components.
 */
export function formatSprintDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

/**
 * Determine the ISO date string for `today + offsetDays`.
 * Used to set default dates in the StartSprintDialog.
 */
export function isoDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** True when a sprint is within its scheduled window (startDate ≤ today ≤ endDate). */
export function isSprintOverdue(sprint: Sprint): boolean {
  if (!sprint.endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(sprint.endDate);
  end.setHours(0, 0, 0, 0);
  return sprint.status === 'active' && end < today;
}
