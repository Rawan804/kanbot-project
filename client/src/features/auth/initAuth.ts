import { setUnauthorizedHandler } from '../../api/client';
import { queryClient } from '../../app/query-client';
import { useAuthStore } from './store';
export function initAuth(): void {
  setUnauthorizedHandler(() => {
    const { status, clearSession } = useAuthStore.getState();
    if (status !== 'authenticated') return;
    clearSession('expired');
    queryClient.clear();
  });
}
