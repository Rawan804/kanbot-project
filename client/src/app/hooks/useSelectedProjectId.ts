import { useLocation } from 'react-router';
export function useSelectedProjectId(): string | undefined {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1];
}
