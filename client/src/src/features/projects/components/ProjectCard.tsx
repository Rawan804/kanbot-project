import { Link } from 'react-router';
import type { ProjectWithStats } from '../../../types/api';
import { BacklogIcon, PencilIcon, SprintsIcon, TrashIcon } from '../../../shared/components/icons';
import { getErrorMessage } from '../../../lib/api-error';
import { useSprints } from '../../backlog/hooks/useSprints';

interface ProjectCardProps {
  project: ProjectWithStats;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const { data: sprints, isLoading, isError, error } = useSprints(project.id);
  const activeSprints = (sprints ?? []).filter((sprint) => sprint.status === 'active');

  return (
    <article className="group flex min-h-52 flex-col rounded-2xl border border-kanbot-border bg-kanbot-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-kanbot-primary/30 hover:shadow-md dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:shadow-none dark:hover:border-kanbot-primary/40 dark:hover:shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-kanbot-primary-soft px-1.5 text-xs font-bold tracking-wide text-kanbot-primary dark:bg-kanbot-primary/20 dark:text-kanbot-dark-primary">
            {project.key}
          </span>
          <h3 className="min-w-0 truncate text-base font-semibold text-kanbot-text dark:text-kanbot-dark-text">
            <Link
              to={`/projects/${project.id}/backlog`}
              className="rounded transition-colors hover:text-kanbot-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:hover:text-kanbot-dark-primary"
            >
              {project.name}
            </Link>
          </h3>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${project.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-kanbot-muted transition-colors hover:bg-kanbot-surface-elevated hover:text-kanbot-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${project.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-kanbot-muted transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-kanbot-dark-muted dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
        {project.description || 'No description'}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-kanbot-border pt-3 dark:border-kanbot-dark-border">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-kanbot-surface-elevated px-2.5 py-1.5 text-xs text-kanbot-muted dark:bg-kanbot-dark-surface-elevated dark:text-kanbot-dark-muted">
          <BacklogIcon className="h-4 w-4" />
          <strong className="font-semibold text-kanbot-text dark:text-kanbot-dark-text">
            {project.stats.backlogCount}
          </strong>
          in backlog
        </span>
        {isLoading ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
            Checking sprint\u2026
          </span>
        ) : isError ? (
          <span
            role="alert"
            className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400"
          >
            Sprint status unavailable: {getErrorMessage(error)}
          </span>
        ) : activeSprints.length > 1 ? (
          <span
            role="alert"
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400"
          >
            {activeSprints.length} active sprints \u2014 resolve inconsistency
          </span>
        ) : activeSprints.length === 1 ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-kanbot-sage-soft px-2.5 py-1.5 text-xs font-medium text-kanbot-sage dark:bg-emerald-900/30 dark:text-emerald-400">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-kanbot-sage dark:bg-emerald-400"
              aria-hidden="true"
            />
            <span className="truncate">Active: {activeSprints[0].name}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
            <SprintsIcon className="h-4 w-4" aria-hidden="true" />
            No active sprint
          </span>
        )}
      </div>
    </article>
  );
}
