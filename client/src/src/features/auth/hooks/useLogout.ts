import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store';
/** AUTH-4: forget the token, drop cached data, go to /login. */
export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useCallback(() => {
    logout();
    queryClient.clear();
    navigate('/login', { replace: true });
  }, [logout, queryClient, navigate]);
}
