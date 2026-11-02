/** Only allow in-app paths, so `?redirect=` can't send people to another site. */
export function safeRedirect(raw: string | null, fallback = '/projects'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  if (raw.startsWith('/login') || raw.startsWith('/register')) return fallback;
  return raw;
}
