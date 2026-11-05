import { Link, useLocation } from 'react-router';
import { useProject } from '../../features/projects/hooks/useProjects';
import { cn } from '../../shared/lib/cn';
import { Button } from '../../shared/components/Button';
import { ChevronRightIcon, MenuIcon, SparklesIcon } from '../../shared/components/icons';
import { useSelectedProjectId } from '../hooks/useSelectedProjectId';

interface TopbarProps {
  onOpenNav: () => void;
  onOpenAI: () => void;
}

/** Maps the current path to the "page title" shown as the last breadcrumb crumb. */
function sectionFromPath(pathname: string): string {
  if (pathname === '/projects') return 'Projects';
  if (pathname.endsWith('/backlog')) return 'Backlog';
  if (pathname.endsWith('/board')) return 'Board';
  if (pathname.endsWith('/sprints')) return 'Sprints';
  return 'Projects';
}

/**
 * Persistent top bar: breadcrumb / page title (with project context when a
 * project is selected), the Ask AI action, and the mobile navigation trigger.
 */
export function Topbar({ onOpenNav, onOpenAI }: TopbarProps) {
  const { pathname } = useLocation();
  const projectId = useSelectedProjectId();
  const { data: project } = useProject(projectId);

  const section = sectionFromPath(pathname);
  const onProjectsList = pathname === '/projects';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff] lg:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link
          to="/projects"
          className={cn(
            'truncate hover:text-slate-900',
            onProjectsList ? 'font-semibold text-slate-900' : 'text-slate-500',
          )}
        >
          Projects
        </Link>
        {projectId && (
          <>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate font-semibold text-slate-900">
              {project?.name ?? 'Project'}
            </span>
            {!onProjectsList && section !== 'Projects' && (
              <>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate text-slate-700">{section}</span>
              </>
            )}
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary" size="md" onClick={onOpenAI}>
          <SparklesIcon className="h-4 w-4" />
          Ask AI
        </Button>
      </div>
    </header>
  );
}
