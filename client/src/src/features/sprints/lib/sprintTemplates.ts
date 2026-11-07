export interface SprintTemplate {
  id: string;
  name: string;
  durationDays: number;
  capacity: number;
}

export const SPRINT_TEMPLATES: SprintTemplate[] = [
  { id: 'focus-week', name: 'Focus week', durationDays: 7, capacity: 15 },
  { id: 'standard-two-week', name: 'Standard two-week sprint', durationDays: 14, capacity: 30 },
  { id: 'high-capacity-two-week', name: 'High-capacity two-week sprint', durationDays: 14, capacity: 40 },
];

export function getSprintDateRange(
  durationDays: number,
  startValue: string,
): { startDate: string; endDate: string } {
  const start = startValue ? new Date(`${startValue}T00:00:00`) : new Date();
  if (Number.isNaN(start.getTime())) throw new RangeError('The sprint start date is invalid.');
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays - 1);
  const format = (date: Date) =>
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  return { startDate: format(start), endDate: format(end) };
}
