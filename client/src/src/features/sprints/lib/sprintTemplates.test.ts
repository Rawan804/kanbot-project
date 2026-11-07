import { describe, expect, it } from 'vitest';
import { getSprintDateRange, SPRINT_TEMPLATES } from './sprintTemplates';

describe('sprint templates', () => {
  it('creates a date-only range that includes the start date', () => {
    expect(getSprintDateRange(7, '2026-04-04')).toEqual({
      startDate: '2026-04-04',
      endDate: '2026-04-10',
    });
  });

  it('provides usable duration and planning-capacity presets', () => {
    expect(SPRINT_TEMPLATES.every((template) => template.durationDays > 0 && template.capacity > 0)).toBe(true);
  });
});
