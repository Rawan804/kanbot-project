export const LABEL_COLORS = [
  'kb-tone-lav',
  'kb-tone-rose',
  'kb-tone-sage',
  'kb-tone-sky',
  'kb-tone-sand',
];

export function labelColorClass(label: string): string {
  let hash = 0;
  for (const char of label.toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return LABEL_COLORS[hash % LABEL_COLORS.length];
}

export type DueDateState = 'overdue' | 'today' | 'soon' | 'later';

export function getDueDateState(dueDate: string, today = new Date()): DueDateState {
  const [year, month, day] = dueDate.split('-').map(Number);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueStart = new Date(year, month - 1, day);
  const difference = Math.round((dueStart.getTime() - todayStart.getTime()) / 86_400_000);

  if (difference < 0) return 'overdue';
  if (difference === 0) return 'today';
  if (difference <= 3) return 'soon';
  return 'later';
}

export function formatDueDate(dueDate: string): string {
  const [year, month, day] = dueDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}
