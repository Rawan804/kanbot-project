import { Link } from 'react-router';
import type { ProjectWithStats } from '../../../types/api';
import {BacklogIcon,PencilIcon,SprintsIcon,TrashIcon,} from '../../../shared/components/icons';

interface ProjectCardProps {project: ProjectWithStats;onEdit: () => void ; onDelete: () => void;
}
export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-[#eef1ff] px-1.5 text-xs font-bold tracking-wide text-[#2f4bff]">
            {project.key}
          </span>
          <h3 className="min-w-0 truncate text-base font-semibold text-slate-900">
            <Link
              to={`/projects/${project.id}/backlog`}
              className="rounded hover:text-[#2f4bff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${project.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
        {project.description || 'No description'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <BacklogIcon className="h-4 w-4 text-slate-400" />
          {project.stats.backlogCount} in backlog
        </span>
        {project.stats.activeSprint ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
            Active: {project.stats.activeSprint.name}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <SprintsIcon className="h-4 w-4" />
            No active sprint
          </span>
        )}
      </div>
    </article>
  );
}
