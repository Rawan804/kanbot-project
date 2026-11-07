
export function safeRedirect(raw: string | null, fallback = '/projects'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  if (raw.startsWith('/login') || raw.startsWith('/register')) return fallback;
  return raw;
}
