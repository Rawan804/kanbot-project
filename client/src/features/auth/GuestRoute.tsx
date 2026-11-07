import { Navigate, Outlet, useSearchParams } from 'react-router';
import { FullPageLoader } from '../../shared/components/FullPageLoader';
import { safeRedirect } from '../../lib/redirect';
import { useAuthStore } from './store';
export function GuestRoute() {
  const status = useAuthStore((s) => s.status);
  const [params] = useSearchParams();

  if (status === 'booting') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to={safeRedirect(params.get('redirect'))} replace />;
  return <Outlet />;
}
