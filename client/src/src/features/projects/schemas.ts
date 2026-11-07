import { z } from 'zod';
export const projectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Use 80 characters or fewer'),
  key: z.string() .trim() .toUpperCase().refine((v) => v === '' || /^[A-Z]{2,6}$/.test(v), 'Key must be 2–6 letters'),
  description: z.string().max(500, 'Use 500 characters or fewer'),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
