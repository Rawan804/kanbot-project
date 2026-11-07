import type { z } from 'zod';

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

export function validate<T>(schema: z.ZodType<T>, values: unknown): ValidationResult<T> {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !(key in errors)) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
