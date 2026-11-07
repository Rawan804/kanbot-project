import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import logo from '../../../../assets/kanbot-icon.svg';
import { cn } from '../../shared/lib/cn';
import {
  BacklogIcon,
  BoardIcon,
  CalendarIcon,
  ProjectsIcon,
  SprintsIcon,
} from '../../shared/components/icons';
import { ProjectSwitcher } from './ProjectSwitcher';
import { UserMenu } from './UserMenu';
import { useSelectedProjectId } from '../hooks/useSelectedProjectId';

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  collapsed?: boolean;
  end?: boolean;
  onNavigate?: () => void;
}

function NavItem({ to, icon, label, disabled, collapsed, end, onNavigate }: NavItemProps) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title={collapsed ? `${label} \u2014 select a project first` : 'Select a project first'}
        aria-label={collapsed ? label : undefined}
        className={cn(
          'flex min-h-10 w-full items-center rounded-lg py-2 text-sm text-kanbot-sidebar-muted/50',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3 text-left',
        )}
      >
        {icon}
        {!collapsed && <span>{label}</span>}
      </button>
    );
  }
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex min-h-10 items-center rounded-lg py-2 text-sm transition-colors',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          isActive
            ? 'bg-kanbot-sidebar-active font-semibold text-kanbot-sidebar-active-text shadow-[inset_0_0_0_1px_hsl(var(--kanbot-primary)/0.18)] before:absolute before:left-0 before:top-1/2 before:h-5 before:-translate-y-1/2 before:w-1 before:rounded-r before:bg-kanbot-sidebar-accent'
            : 'text-kanbot-sidebar-muted hover:bg-kanbot-sidebar-hover hover:text-kanbot-sidebar-text',
        )
      }
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export function Sidebar({ className, collapsed = false, onNavigate }: SidebarProps) {
  const projectId = useSelectedProjectId();
  const hasProject = Boolean(projectId);

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-kanbot-sidebar-border bg-kanbot-sidebar text-kanbot-sidebar-muted',
        className,
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-[4.5rem] shrink-0 items-center border-b border-kanbot-sidebar-border/70',
          collapsed ? 'justify-center px-0' : 'gap-2.5 px-4',
        )}
      >
        <img
          src={logo}
          alt="Kanbot logo"
          width={32}
          height={32}
          className="h-9 w-9 rounded-xl shadow-sm"
        />
        {!collapsed && (
          <div className="min-w-0">
            <span className="block truncate text-base font-bold tracking-tight text-kanbot-sidebar-text">
              Kanbot
            </span>
            <span className="block text-[10px] font-medium tracking-wide text-kanbot-sidebar-muted">
              Workspace
            </span>
          </div>
        )}
      </div>

      {/* Project switcher */}
      <div className={cn('pb-2 pt-4', collapsed ? 'px-2' : 'px-3')}>
        <ProjectSwitcher collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      {/* Navigation */}
      <nav
        aria-label="Primary"
        className={cn('flex-1 overflow-y-auto py-2', collapsed ? 'space-y-0.5 px-2' : 'space-y-0.5 px-3')}
        data-lenis-prevent
      >
        {!collapsed && (
          <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-kanbot-sidebar-muted">
            Workspace
          </p>
        )}
        <NavItem
          to="/projects"
          end
          icon={<ProjectsIcon className="h-5 w-5" />}
          label="Projects"
          collapsed={collapsed}
          onNavigate={onNavigate}
        />

        {!collapsed && (
          <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-widest text-kanbot-sidebar-muted">
            Project
          </p>
        )}
        <NavItem
          to={`/projects/${projectId ?? ''}/backlog`}
          icon={<BacklogIcon className="h-5 w-5" />}
          label="Backlog"
          disabled={!hasProject}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <NavItem
          to={`/projects/${projectId ?? ''}/board`}
          icon={<BoardIcon className="h-5 w-5" />}
          label="Board"
          disabled={!hasProject}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <NavItem
          to={`/projects/${projectId ?? ''}/week`}
          icon={<CalendarIcon className="h-5 w-5" />}
          label="My Week"
          disabled={!hasProject}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <NavItem
          to={`/projects/${projectId ?? ''}/sprints`}
          icon={<SprintsIcon className="h-5 w-5" />}
          label="Sprints"
          disabled={!hasProject}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </nav>

      {/* User + logout */}
      <div
        className={cn(
          'shrink-0 border-t border-kanbot-sidebar-border/50',
          collapsed ? 'p-2' : 'p-3',
        )}
      >
        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
