import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoader } from '../../shared/components/FullPageLoader';
import { useAuthStore } from './store';

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const exitReason = useAuthStore((s) => s.exitReason);
  const { pathname, search } = useLocation();

  if (status === 'booting') return <FullPageLoader />;
  if (status === 'guest') {
    // After an explicit logout, don't send people back to the page they just left.
    const to = exitReason === 'logout' ? '/login' : `/login?redirect=${encodeURIComponent(pathname + search)}`;
    return <Navigate to={to} replace />;
  }
  return <Outlet />;
}
