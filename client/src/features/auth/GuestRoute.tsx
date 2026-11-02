import { Navigate, Outlet, useSearchParams } from 'react-router';
import { FullPageLoader } from '../../shared/components/FullPageLoader';
import { safeRedirect } from '../../lib/redirect';
import { useAuthStore } from './store';

/** Signed-in users are sent to `?redirect=` (AUTH-2) or /projects (AUTH-1, AUTH-5). */
export function GuestRoute() {
  const status = useAuthStore((s) => s.status);
  const [params] = useSearchParams();

  if (status === 'booting') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to={safeRedirect(params.get('redirect'))} replace />;
  return <Outlet />;
}
