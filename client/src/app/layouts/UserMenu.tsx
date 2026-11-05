import { useAuthStore } from '../../features/auth/store';
import { useLogout } from '../../features/auth/hooks/useLogout';
import { LogOutIcon } from '../../shared/components/icons';

/**
 * Sidebar footer: the signed-in user's info + a logout action. No dropdown —
 * keeps it fully keyboard accessible and simple. Reuses the existing `useLogout`
 * hook, which already clears the token, drops the query cache, and redirects.
 */
export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  if (!user) return null;

  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2f4bff]/20 text-sm font-semibold text-white"
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-slate-400">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={logout}
        aria-label="Log out"
        title="Log out"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
      >
        <LogOutIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
