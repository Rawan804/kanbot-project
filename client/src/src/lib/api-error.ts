import type { ApiErrorBody } from '../types/api';

/**
 * The single, typed error shape for every failed API request. `api/client.ts`
 * throws this; React Query surfaces it via `error`/`isError`; forms map its
 * `details` to fields with `fieldErrors()`.
 *
 * `status === 0` means the server could not be reached (network failure).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: { path: string; message: string }[];
  /** True when the server could not be reached. */
  readonly isNetwork: boolean;

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiErrorBody['error']['details'] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isNetwork = status === 0;
  }
}

// Re-exported so existing imports of `ApiErrorBody` from this module keep
// working, while `types/api.ts` stays the single source of truth.
export type { ApiErrorBody } from '../types/api';

/** Type guard for ApiError (errors arrive as `unknown`). */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/**
 * Should a failed request be retried automatically? Only transient failures —
 * network errors and 5xx server errors. Client errors (4xx: auth, validation,
 * not-found, conflict, rate-limited) are never retried.
 */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 0 || err.status >= 500;
  }
  return false;
}

/**
 * Map any error to a safe, user-facing message.
 *
 * For 4xx responses the backend's own message is already safe to display (per
 * the API contract) and more specific than a generic string, so we pass it
 * through. We only generalise network, rate-limit, and 5xx cases (where the
 * backend message is absent or unhelpful), and fall back for non-ApiError values.
 * No stack traces, tokens, or internal details are ever shown.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetwork) {
      return 'Unable to connect to the server. Check your connection and try again.';
    }
    if (err.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (err.status >= 500) {
      return 'Something went wrong on our end. Please try again.';
    }
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

/** Maps `details[]` to `{ [field]: message }` (first message per field wins). */
export function fieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (err instanceof ApiError) {
    for (const d of err.details) if (!(d.path in out)) out[d.path] = d.message;
  }
  return out;
}
