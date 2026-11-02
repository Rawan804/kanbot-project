import { create } from 'zustand';
import { me } from './api/auth.api';
import { ApiError } from '../../lib/api-error';
import { tokenStorage } from '../../lib/token';
import type { AuthResponse, User } from '../../types/api';

export type AuthStatus = 'booting' | 'authenticated' | 'guest';
/** Why the session ended: decides the message and whether `?redirect=` is added. */
export type ExitReason = 'expired' | 'logout' | null;

interface AuthState {
  token: string | null;
  user: User | null;
  status: AuthStatus;
  exitReason: ExitReason;
  setSession: (auth: AuthResponse) => void;
  clearSession: (reason?: ExitReason) => void;
  logout: () => void;
  bootstrap: () => Promise<void>;
}
let bootPromise: Promise<void> | null = null; // StrictMode runs effects twice
export const useAuthStore = create<AuthState>((set, get) => {
  const token = tokenStorage.get();
  return {
    token,
    user: null,
    status: token ? 'booting' : 'guest',
    exitReason: null,

    setSession: ({ token, user }) => {
      tokenStorage.set(token);
      set({ token, user, status: 'authenticated', exitReason: null });
    },

    clearSession: (reason = null) => {
      tokenStorage.clear();
      set({ token: null, user: null, status: 'guest', exitReason: reason });
    },

    logout: () => get().clearSession('logout'),

    // AUTH-3: validate the stored token on app start.
    bootstrap: () => {
      if (get().status !== 'booting') return Promise.resolve();
      bootPromise ??= (async () => {
        try {
          const { user } = await me();
          set({ user, status: 'authenticated' });
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) get().clearSession();
          else set({ status: 'guest' }); // server down: show login, keep the token
        }
      })();
      return bootPromise;
    },
  };
});
