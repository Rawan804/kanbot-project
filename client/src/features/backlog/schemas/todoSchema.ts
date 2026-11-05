import { z } from 'zod';
import { TODO_PRIORITIES, TODO_STATUSES, TODO_TYPES } from '../../../types/api';
import type { StoryPoints } from '../../../types/api';

/**
 * Zod schema for the todo edit form.
 *
 * storyPoints is kept outside Zod validation (it's controlled via PointsSelect,
 * not a text input) and passed separately on submit. All other fields go through
 * the standard RHF + zodResolver flow.
 */
export const todoFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Max 200 characters'),
  description: z.string().max(5000, 'Max 5000 characters'),
  type: z.enum(TODO_TYPES),
  status: z.enum(TODO_STATUSES),
  priority: z.enum(TODO_PRIORITIES),
  /** Stored as a comma-separated string in the input; split on submit. */
  labels: z.string(),
  /** YYYY-MM-DD or empty string (→ null on submit). */
  dueDate: z.string(),
  /** Sprint id, or empty string meaning "backlog" (sprintId: null on submit). */
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
