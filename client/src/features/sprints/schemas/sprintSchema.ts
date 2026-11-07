import { z } from 'zod';

/**
 * Zod schema for the sprint create/edit form.
 *
 * All fields are optional on the wire (the server defaults name to "Sprint N"),
 * but we collect them here as empty strings so the form controls are always
 * controlled. The submit handler strips empty strings before sending.
 */
export const sprintFormSchema = z
  .object({
    name: z.string().max(100, 'Name must be 100 characters or fewer'),
    goal: z.string().max(300, 'Goal must be 300 characters or fewer'),
    startDate: z.string(), // YYYY-MM-DD or ''
    endDate: z.string(),   // YYYY-MM-DD or ''
  })
  .refine(
    (v) => {
      if (!v.startDate || !v.endDate) return true; // either absent → no constraint
      return v.endDate >= v.startDate;
    },
    { message: 'End date must be on or after start date', path: ['endDate'] },
  );

export type SprintFormValues = z.infer<typeof sprintFormSchema>;
