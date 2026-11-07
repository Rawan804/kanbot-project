import { ApiError, type ApiErrorBody } from '../lib/api-error';
import { tokenStorage } from '../lib/token';
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api'
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
interface RequestOptions {
  /** Don't trigger the "session expired" flow on 401 (used by the startup /auth/me check). */
  silent401?: boolean;
}
let onUnauthorized: (() => void) | null = null;
/** Registered once by `initAuth()` so this file never imports the auth store. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}
export async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is it running?');
  }

  if (res.status === 204) return undefined as T;

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    if (res.ok) {
      throw new ApiError(
        res.status,
        'INVALID_RESPONSE',
        'The server returned an invalid response. Please try again.',
      );
    }
  }
  if (!res.ok) {
    const e = (json as ApiErrorBody | null)?.error;
    const err = new ApiError(
      res.status,
      e?.code ?? 'INTERNAL_ERROR',
      e?.message ?? `Request failed (${res.status})`,
      e?.details,
    );
    if (res.status === 401 && path !== '/auth/login' && !options.silent401) onUnauthorized?.(); // AUTH-6
    throw err;
  }
  return json as T;
}
