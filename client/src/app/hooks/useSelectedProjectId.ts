import { useLocation } from 'react-router';

/**
 * The currently-selected project id, derived from the URL — never stored in a
 * separate store. Reading it from the pathname (rather than useParams) makes the
 * result correct in the shared layout (Sidebar / Topbar / ProjectSwitcher),
 * independent of where in the route tree the hook is called.
 *
 * Matches `/projects/:projectId` and any deeper path beneath it
 * (e.g. `/projects/123/backlog`), and returns undefined on `/projects` itself.
 */
export function useSelectedProjectId(): string | undefined {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1];
}
