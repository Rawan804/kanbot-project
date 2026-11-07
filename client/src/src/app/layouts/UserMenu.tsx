import { useAuthStore } from '../../features/auth/store';
import { useLogout } from '../../features/auth/hooks/useLogout';
import { LogOutIcon } from '../../shared/components/icons';

/**
 * Sidebar footer: the signed-in user's info + a logout action.
 */
export function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  if (!user) return null;

  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex items-center ${
        collapsed ? 'flex-col gap-2 p-1' : 'gap-3 p-2'
      }`}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kanbot-sidebar-accent text-xs font-bold text-kanbot-sidebar-accent-text ring-2 ring-kanbot-sidebar-bg"
        aria-hidden="true"
      >
        {initials}
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-kanbot-sidebar-text">{user.name}</p>
          <p className="truncate text-xs text-kanbot-sidebar-muted">{user.email}</p>
        </div>
      )}
      <button
        type="button"
        onClick={logout}
        aria-label="Log out"
        title="Log out"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-kanbot-sidebar-muted transition-colors hover:bg-kanbot-sidebar-hover hover:text-kanbot-sidebar-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary"
      >
        <LogOutIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
