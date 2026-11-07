import { Link, useLocation } from 'react-router';
import { useProject } from '../../features/projects/hooks/useProjects';
import { cn } from '../../shared/lib/cn';
import { Button } from '../../shared/components/Button';
import {
  ChevronRightIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SparklesIcon,
  SunIcon,
} from '../../shared/components/icons';
import { useSelectedProjectId } from '../hooks/useSelectedProjectId';
import { useTheme } from '../hooks/useTheme';

interface TopbarProps {
  onOpenNav: () => void;
  onOpenAI: () => void;
  onOpenCommands: () => void;
}

/** Maps the current path to the page title shown as the last breadcrumb crumb. */
function sectionFromPath(pathname: string): string {
  if (pathname === '/projects') return 'Projects';
  if (pathname.endsWith('/backlog')) return 'Backlog';
  if (pathname.endsWith('/board')) return 'Board';
  if (pathname.endsWith('/sprints')) return 'Sprints';
  if (pathname.endsWith('/week')) return 'My Week';
  return 'Projects';
}

/**
 * Persistent top bar: breadcrumb / page title (with project context when a
 * project is selected), the theme toggle, the Ask AI action, and the mobile
 * navigation trigger.
 */
export function Topbar({ onOpenNav, onOpenAI, onOpenCommands }: TopbarProps) {
  const { pathname } = useLocation();
  const projectId = useSelectedProjectId();
  const { data: project } = useProject(projectId);
  const { theme, toggleTheme } = useTheme();

  const section = sectionFromPath(pathname);
  const onProjectsList = pathname === '/projects';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-kanbot-border bg-kanbot-surface px-4 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface sm:px-6">
      {/* Mobile nav trigger */}
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-kanbot-muted transition-colors hover:bg-kanbot-surface-elevated hover:text-kanbot-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text md:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
        <Link
          to="/projects"
          className={cn(
            'truncate transition-colors hover:text-kanbot-text dark:hover:text-kanbot-dark-text',
            onProjectsList
              ? 'font-semibold text-kanbot-text dark:text-kanbot-dark-text'
              : 'text-kanbot-muted dark:text-kanbot-dark-muted',
          )}
        >
          Projects
        </Link>
        {projectId && (
          <>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-kanbot-muted dark:text-kanbot-dark-muted" />
            <span className="truncate font-semibold text-kanbot-text dark:text-kanbot-dark-text">
              {project?.name ?? 'Project'}
            </span>
            {!onProjectsList && section !== 'Projects' && (
              <>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-kanbot-muted dark:text-kanbot-dark-muted" />
                <span className="truncate text-kanbot-muted dark:text-kanbot-dark-muted">
                  {section}
                </span>
              </>
            )}
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCommands}
          aria-label="Open command palette"
          title="Search (Ctrl/⌘ K)"
          className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-kanbot-muted transition-colors hover:bg-kanbot-surface-elevated hover:text-kanbot-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text sm:px-3"
        >
          <SearchIcon className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">Search</span>
          <kbd className="hidden rounded border border-kanbot-border bg-kanbot-surface px-1.5 py-0.5 text-[10px] dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface md:inline">Ctrl K</kbd>
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-kanbot-muted transition-colors hover:bg-kanbot-surface-elevated hover:text-kanbot-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text"
        >
          {theme === 'dark' ? (
            <SunIcon className="h-4 w-4" />
          ) : (
            <MoonIcon className="h-4 w-4" />
          )}
        </button>

        {/* AI drawer trigger */}
        <Button
          variant="primary"
          size="md"
          onClick={onOpenAI}
          className="bg-gradient-to-br from-kanbot-primary to-kanbot-primary-active hover:brightness-110"
        >
          <SparklesIcon className="h-4 w-4" />
          Ask AI
        </Button>
      </div>
    </header>
  );
}
