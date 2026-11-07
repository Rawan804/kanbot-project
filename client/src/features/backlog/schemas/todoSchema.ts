import { z } from 'zod';
import { TODO_PRIORITIES, TODO_STATUSES, TODO_TYPES } from '../../../types/api';
import type { StoryPoints } from '../../../types/api';

/** Zod validation shared by the create and edit todo forms. */
export const todoFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Max 200 characters'),
  description: z.string().max(5000, 'Max 5000 characters'),
  type: z.enum(TODO_TYPES),
  status: z.enum(TODO_STATUSES),
  priority: z.enum(TODO_PRIORITIES),
  storyPoints: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(5),
    z.literal(8),
    z.literal(13),
    z.null(),
  ]),
  labels: z.string().superRefine((value, ctx) => {
    const labels = parseLabels(value);
    if (labels.length > 10) {
      ctx.addIssue({ code: 'custom', message: 'Use no more than 10 labels.' });
    }
    if (labels.some((label) => label.length > 30)) {
      ctx.addIssue({ code: 'custom', message: 'Each label must be 30 characters or fewer.' });
    }
  }),
  dueDate: z.string().refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'Enter a valid date.',
  ),
  sprintId: z.string(),
});

export type TodoFormValues = z.infer<typeof todoFormSchema>;

/** Utility: parse comma-separated labels input to trimmed array. */
export function parseLabels(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Utility: convert labels array back to comma-separated for the form input. */
export function labelsToString(labels: string[]): string {
  return labels.join(', ');
}

// Re-export for convenience
export type { StoryPoints };
