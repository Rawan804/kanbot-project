import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useProjects } from '../../features/projects/hooks/useProjects';
import { getErrorMessage } from '../../lib/api-error';
import { ChevronDownIcon, CheckIcon, PlusIcon } from '../../shared/components/icons';
import { useSelectedProjectId } from '../hooks/useSelectedProjectId';

interface Props {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Project switcher in the sidebar.
 * The trigger button uses sidebar token colors.
 * The dropdown panel uses light-surface tokens (pops out from dark sidebar).
 */
export function ProjectSwitcher({ collapsed = false, onNavigate }: Props) {
  const projectId = useSelectedProjectId();
  const navigate = useNavigate();
  const { data: projects, isLoading, isError, error, refetch } = useProjects();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = projects?.find((p) => p.id === projectId);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const go = (id: string) => {
    setOpen(false);
    onNavigate?.();
    navigate(`/projects/${id}/backlog`);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          collapsed
            ? current
              ? `Switch project, current: ${current.name}`
              : 'Select a project'
            : undefined
        }
        title={collapsed ? (current?.name ?? 'Select a project') : undefined}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center rounded-xl text-sm text-kanbot-sidebar-text transition-colors hover:bg-kanbot-sidebar-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary/60 ${
          collapsed ? 'h-10 justify-center p-1' : 'gap-2.5 px-3 py-2.5 text-left'
        }`}
      >
        {collapsed ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-kanbot-sidebar-accent px-1 text-[10px] font-semibold tracking-wide text-kanbot-sidebar-accent-text">
            {current?.key ?? '\u2026'}
          </span>
        ) : (
          <>
            <span className="truncate font-medium text-kanbot-sidebar-text">
              {current ? current.name : 'Select a project'}
            </span>
            {current && (
              <span className="ml-auto shrink-0 rounded-md bg-kanbot-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-kanbot-sidebar-accent-text">
                {current.key}
              </span>
            )}
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-kanbot-sidebar-muted" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch project"
          className={`absolute z-50 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-kanbot-border bg-kanbot-surface py-1.5 shadow-2xl dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface ${
            collapsed ? 'left-full top-0 ml-2' : 'left-0 mt-1.5'
          }`}
        >
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-kanbot-muted dark:text-kanbot-dark-muted">
            Your projects
          </p>
          <div className="max-h-64 overflow-y-auto" data-lenis-prevent>
            {isLoading && (
              <p className="px-3 py-2 text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
                Loading\u2026
              </p>
            )}
            {isError && (
              <button
                type="button"
                role="menuitem"
                onClick={() => void refetch()}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-kanbot-primary dark:hover:bg-red-950/30"
              >
                {getErrorMessage(error)} \u2014 Retry
              </button>
            )}
            {!isLoading && !isError && projects?.length === 0 && (
              <p className="px-3 py-2 text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
                No projects yet.
              </p>
            )}
            {!isError &&
              projects?.map((p) => {
                const active = p.id === projectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitem"
                    onClick={() => go(p.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-kanbot-surface-elevated dark:text-kanbot-dark-text dark:hover:bg-kanbot-dark-surface-elevated"
                  >
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-kanbot-primary-soft px-1.5 text-[10px] font-bold tracking-wide text-kanbot-primary dark:bg-kanbot-primary/20 dark:text-kanbot-dark-primary">
                      {p.key}
                    </span>
                    <span
                      className={
                        active
                          ? 'font-medium text-kanbot-text dark:text-kanbot-dark-text'
                          : 'text-kanbot-muted dark:text-kanbot-dark-muted'
                      }
                    >
                      {p.name}
                    </span>
                    {active && (
                      <CheckIcon className="ml-auto h-4 w-4 text-kanbot-primary dark:text-kanbot-dark-primary" />
                    )}
                  </button>
                );
              })}
          </div>
          <div className="mt-1 border-t border-kanbot-border pt-1 dark:border-kanbot-dark-border">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
                navigate('/projects');
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-kanbot-muted transition-colors hover:bg-kanbot-surface-elevated dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated"
            >
              <PlusIcon className="h-4 w-4" />
              All projects
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
