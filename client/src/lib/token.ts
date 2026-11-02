const KEY = 'kanbot.token';

// Only the JWT is stored client-side (NFR-7). Never log it.
export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null; // storage blocked (private mode, etc.)
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(KEY, token);
    } catch {
      /* storage blocked: session lasts until reload */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* nothing to clear */
    }
  },
};
