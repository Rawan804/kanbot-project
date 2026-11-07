import { describe, expect, it } from 'vitest';
import { formatDueDate, getDueDateState, labelColorClass } from './todoIndicatorUtils';

describe('todo indicators', () => {
  it('assigns stable colors to labels without case sensitivity', () => {
    expect(labelColorClass('Frontend')).toBe(labelColorClass('frontend'));
  });

  it('classifies a due date against the local calendar day', () => {
    const today = new Date(2026, 3, 10, 23, 45);
    expect(getDueDateState('2026-04-09', today)).toBe('overdue');
    expect(getDueDateState('2026-04-10', today)).toBe('today');
    expect(getDueDateState('2026-04-12', today)).toBe('soon');
    expect(getDueDateState('2026-04-20', today)).toBe('later');
  });

  it('formats date-only values without timezone shifts', () => {
    expect(formatDueDate('2026-04-04')).toBe('Apr 4');
  });
});
