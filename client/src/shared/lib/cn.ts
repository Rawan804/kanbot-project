/**
 * Tiny className joiner — no external dependency (clsx/tailwind-merge).
 * Falsy values are dropped, the rest are joined with a space.
 *
 * NOTE: this does NOT de-duplicate conflicting Tailwind utilities, so when you
 * override a size you must avoid also passing the default size at the call site.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
