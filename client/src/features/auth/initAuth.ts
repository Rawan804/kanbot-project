import { setUnauthorizedHandler } from '../../api/client';
import { queryClient } from '../../app/query-client';
import { useAuthStore } from './store';

/**
 * Call once before rendering (main.tsx). Any 401 except login ends the session (AUTH-6).
 * ProtectedRoute then redirects to /login?redirect=<current page>.
 */
export function initAuth(): void {
  setUnauthorizedHandler(() => {
    const { status, clearSession } = useAuthStore.getState();
    if (status !== 'authenticated') return;
    clearSession('expired');
    queryClient.clear();
  });
}
