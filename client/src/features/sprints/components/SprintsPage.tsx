import { useState } from 'react';
import { useParams } from 'react-router';
import type { Sprint } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SprintsIcon,
  SparklesIcon,
} from '../../../shared/components/icons';
import { useProject } from '../../projects/hooks/useProjects';
import { useSprints } from '../../backlog/hooks/useSprints';
import { useGenerateSprintSummary } from '../hooks/useSprintMutations';
import { useTodos } from '../../backlog/hooks/useTodos';
import {
  donePointsPercent,
  doneTodosPercent,
  formatSprintDate,
  isSprintOverdue,
} from '../lib/sprintUtils';
import { getErrorMessage } from '../../../lib/api-error';
import { TypeIcon } from '../../../shared/components/TypeIcon';
import { PriorityBadge } from '../../../shared/components/PriorityBadge';
import { PointsBadge } from '../../../shared/components/PointsSelect';
import ReactMarkdown from 'react-markdown';

export function SprintsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);
  const { data: sprints, isLoading, isError, error, refetch } = useSprints(projectId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {project?.name ?? 'Project'}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sprints</h1>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16">
          <Spinner className="h-6 w-6 text-[#2f4bff]" />
          <span className="text-sm text-slate-500">Loading sprints…</span>
        </div>
      )}

      {isError && (
        <EmptyState
          tone="error"
          icon={<AlertTriangleIcon className="h-7 w-7" />}
          title="Couldn't load sprints"
          description={getErrorMessage(error)}
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {!isLoading && !isError && sprints?.length === 0 && (
        <EmptyState
          icon={<SprintsIcon className="h-7 w-7" />}
          title="No sprints yet"
          description="Create a sprint from the Backlog page to start planning."
        />
      )}

      {!isLoading && !isError && sprints && sprints.length > 0 && (
        <div className="space-y-3">
          {sprints.map((sprint) => (
            <SprintRow
              key={sprint.id}
              sprint={sprint}
              projectId={projectId ?? ''}
              isExpanded={expandedId === sprint.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === sprint.id ? null : sprint.id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sprint List Row ──────────────────────────────────────────────────────────

function SprintRow({
  sprint,
  projectId,
  isExpanded,
  onToggle,
}: {
  sprint: Sprint;
  projectId: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const stats = sprint.status === 'completed' && sprint.completedStats
    ? sprint.completedStats
    : sprint.stats;

  const pctLabel =
    stats.totalPoints > 0
      ? `${donePointsPercent(stats)}%`
      : stats.totalTodos > 0
        ? `${doneTodosPercent(stats)}%`
        : '–';

  const startLabel = formatSprintDate(sprint.startDate);
  const endLabel = formatSprintDate(sprint.endDate);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Row header */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2f4bff]"
      >
        {isExpanded ? (
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{sprint.name}</span>
            <SprintStatusPill status={sprint.status} />
            {sprint.status === 'active' && isSprintOverdue(sprint) && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                Overdue
              </span>
            )}
          </div>
          {(startLabel || endLabel) && (
            <p className="mt-0.5 text-xs text-slate-400">
              {startLabel ?? '?'} – {endLabel ?? '?'}
            </p>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-4 text-xs text-slate-500 sm:flex">
          <span>
            <span className="font-semibold text-slate-700">{stats.doneTodos}</span>
            /{stats.totalTodos} done
          </span>
          {stats.totalPoints > 0 && (
            <span>
              <span className="font-semibold text-slate-700">{stats.donePoints}</span>
              /{stats.totalPoints} pts
            </span>
          )}
          <span
            className={cn(
              'font-semibold',
              sprint.status === 'completed' && 'text-green-600',
            )}
          >
            {pctLabel}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <SprintDetail sprint={sprint} projectId={projectId} />
      )}
    </div>
  );
}

// ─── Sprint Detail ────────────────────────────────────────────────────────────

function SprintDetail({
  sprint,
  projectId,
}: {
  sprint: Sprint;
  projectId: string;
}) {
  const generateSummary = useGenerateSprintSummary(projectId);
  const { data: todos, isLoading: todosLoading } = useTodos(projectId, {
    sprintId: sprint.id,
  });

  const stats =
    sprint.status === 'completed' && sprint.completedStats
      ? sprint.completedStats
      : sprint.stats;

  return (
    <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
      {/* Goal */}
      {sprint.goal && (
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">Goal: </span>
          {sprint.goal}
        </p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DetailStat label="Total todos" value={stats.totalTodos} />
        <DetailStat label="Done" value={stats.doneTodos} />
        <DetailStat label="Total points" value={stats.totalPoints} />
        <DetailStat label="Done points" value={stats.donePoints} />
        {sprint.status === 'completed' && sprint.completedStats && (
          <DetailStat label="Carried over" value={sprint.completedStats.carriedOver} />
        )}
      </div>

      {/* Progress bar */}
      {(stats.totalTodos > 0 || stats.totalPoints > 0) && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#2f4bff]"
              style={{
                width: `${stats.totalPoints > 0 ? donePointsPercent(stats) : doneTodosPercent(stats)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Todo list (compact) */}
      {todosLoading && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Spinner className="h-4 w-4 text-[#2f4bff]" />
          Loading todos…
        </div>
      )}
      {!todosLoading && todos && todos.length > 0 && (
        <div className="space-y-0.5">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
            >
              <TypeIcon type={todo.type} size="h-3.5 w-3.5" className="shrink-0" />
              <span className="font-mono text-[10px] text-slate-400 w-16 shrink-0">{todo.key}</span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate',
                  todo.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700',
                )}
              >
                {todo.title}
              </span>
              <PriorityBadge priority={todo.priority} iconOnly />
              <PointsBadge points={todo.storyPoints} />
            </div>
          ))}
        </div>
      )}

      {/* AI summary section */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <SparklesIcon className="h-4 w-4 text-[#2f4bff]" />
            <span className="text-xs font-semibold text-slate-600">AI Summary</span>
          </div>
          {(sprint.status === 'active' || sprint.status === 'completed') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateSummary.mutate(sprint.id)}
              loading={generateSummary.isPending}
              loadingText="Generating…"
            >
              {sprint.summary ? 'Regenerate' : 'Generate'}
            </Button>
          )}
        </div>

        {generateSummary.isError && (
          <p className="text-xs text-red-600">{getErrorMessage(generateSummary.error)}</p>
        )}

        {sprint.summary ? (
          <div className="prose prose-sm max-w-none text-slate-700">
            <ReactMarkdown>{sprint.summary.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            {sprint.status === 'planned'
              ? 'AI summaries are available once the sprint is active or completed.'
              : 'No summary yet. Click Generate to create one.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SprintStatusPill({ status }: { status: Sprint['status'] }) {
  const config = {
    planned: { label: 'Planned', className: 'border border-slate-200 bg-slate-50 text-slate-500' },
    active: { label: 'Active', className: 'bg-green-100 text-green-700' },
    completed: { label: 'Completed', className: 'bg-slate-100 text-slate-600' },
  }[status];
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', config.className)}>
      {config.label}
    </span>
  );
}

function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
