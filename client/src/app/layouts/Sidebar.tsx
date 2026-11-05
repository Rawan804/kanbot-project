import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import logo from '../../../../assets/kanbot-icon.svg';
import { cn } from '../../shared/lib/cn';
import {
  BacklogIcon,
  BoardIcon,
  ProjectsIcon,
  SprintsIcon,
} from '../../shared/components/icons';
import { ProjectSwitcher } from './ProjectSwitcher';
import { UserMenu } from './UserMenu';
import { useSelectedProjectId } from '../hooks/useSelectedProjectId';
interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}
interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  /** Render as a disabled, non-navigable item (no project selected). */
  disabled?: boolean;
  end?: boolean;
  onNavigate?: () => void;
}

function NavItem({ to, icon, label, disabled, end, onNavigate }: NavItemProps) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title="Select a project first"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-500/70"
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-[#2f4bff]/15 text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:-translate-y-1/2 before:w-1 before:rounded-r before:bg-[#2f4bff]'
            : 'text-slate-300 hover:bg-white/5 hover:text-white',
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const projectId = useSelectedProjectId();
  const hasProject = Boolean(projectId);

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-[#11182f] text-slate-300',
        className,
      )}
    >
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-4">
        <img
          src={logo}
          alt="Kanbot logo"
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg"
        />
        <span className="text-lg font-bold tracking-tight text-white">Kanbot</span>
      </div>

      {/* Project switcher */}
      <div className="px-3 pb-2">
        <ProjectSwitcher onNavigate={onNavigate} />
      </div>

      {/* Navigation */}
      <nav
        aria-label="Primary"
        className="flex-1 overflow-y-auto px-3 py-2"
        data-lenis-prevent
      >
        <NavItem
          to="/projects"
          end
          icon={<ProjectsIcon className="h-5 w-5" />}
          label="Projects"
          onNavigate={onNavigate}
        />

        <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Project
        </p>
        <NavItem
          to={`/projects/${projectId ?? ''}/backlog`}
          icon={<BacklogIcon className="h-5 w-5" />}
          label="Backlog"
          disabled={!hasProject}
          onNavigate={onNavigate}
        />
        <NavItem
          to={`/projects/${projectId ?? ''}/board`}
          icon={<BoardIcon className="h-5 w-5" />}
          label="Board"
          disabled={!hasProject}
          onNavigate={onNavigate}
        />
        <NavItem
          to={`/projects/${projectId ?? ''}/sprints`}
          icon={<SprintsIcon className="h-5 w-5" />}
          label="Sprints"
          disabled={!hasProject}
          onNavigate={onNavigate}
        />
      </nav>

      {/* User + logout */}
      <div className="shrink-0 p-3">
        <UserMenu />
      </div>
    </aside>
  );
}
