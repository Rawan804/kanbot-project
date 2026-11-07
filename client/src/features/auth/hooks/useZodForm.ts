import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { z } from 'zod';
import { ApiError, fieldErrors } from '../../../lib/api-error';
import { validate } from '../../../lib/zod';
type Errors<T> = Partial<Record<keyof T & string, string>>;
export function useZodForm<T extends Record<string, string>>(schema: z.ZodType<T>, initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Errors<T>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const attempted = useRef(false);

  const runValidation = (next: T): Errors<T> => {
    const result = validate(schema, next);
    return result.ok ? {} : (result.errors as Errors<T>);
  };

  const field = (name: keyof T & string) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const next = { ...values, [name]: e.target.value };
      setValues(next);
      setFormError(null);
      if (attempted.current) setErrors(runValidation(next));
      else setErrors((prev) => ({ ...prev, [name]: undefined }));
    },
    onBlur: () => {
      if (values[name] === '' && !attempted.current) return;
      setErrors((prev) => ({ ...prev, [name]: runValidation(values)[name] }));
    },
  });
  const handleSubmit = (action: (data: T) => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    attempted.current = true;

    const result = validate(schema, values);
    if (!result.ok) {
      setErrors(result.errors as Errors<T>);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      await action(result.data);
    } catch (err) {
      const known = Object.keys(initial);
      const fromServer = Object.fromEntries(
        Object.entries(fieldErrors(err)).filter(([k]) => known.includes(k)),
      ) as Errors<T>;

      if (Object.keys(fromServer).length > 0) setErrors(fromServer);
      else setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return { values, field, formError, isSubmitting, handleSubmit };
}
