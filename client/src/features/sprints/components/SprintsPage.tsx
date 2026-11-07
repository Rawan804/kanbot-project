import { useState } from 'react';
import { useParams } from 'react-router';
import type { Sprint, Todo } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { Button } from '../../../shared/components/Button';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  SprintsIcon,
  SparklesIcon,
} from '../../../shared/components/icons';
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
import { downloadTextFile, todosToCsv, todosToMarkdown } from '../../../shared/lib/exportTodos';
import { SprintFormDialog } from './SprintFormDialog';

/**
 * SPR-7: Sprint history page.
 * Shows all sprints (active first, then planned oldest-first, then completed
 * newest-first — server ordering). Each sprint is expandable to show details.
 */
export function SprintsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: sprints, isLoading, isError, error, refetch } = useSprints(projectId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const activeSprintCount = sprints?.filter((sprint) => sprint.status === 'active').length ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sprints"
        description="Plan upcoming work, track progress, and review completed sprints."
        actions={
          projectId ? (
            <Button onClick={() => setCreateSprintOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              Create sprint
            </Button>
          ) : undefined
        }
      />

      {isLoading && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-kanbot-border bg-kanbot-surface py-16 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface">
          <Spinner className="h-6 w-6 text-kanbot-primary" />
          <span className="text-sm text-kanbot-muted dark:text-kanbot-dark-muted">Loading sprints...</span>
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

      {!isLoading && !isError && activeSprintCount > 1 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>
            This project has {activeSprintCount} active sprints. Sprint data has not been
            changed; review the active sprint records.
          </span>
        </div>
      )}

      {!isLoading && !isError && sprints?.length === 0 && (
        <EmptyState
          icon={<SprintsIcon className="h-7 w-7" />}
          title="No sprints yet"
          description="Create a sprint to start planning and tracking upcoming work."
        />
      )}

      {!isLoading && !isError && sprints && sprints.length > 0 && (
        <VelocityChart sprints={sprints} />
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

      {projectId && (
        <SprintFormDialog
          open={createSprintOpen}
          onClose={() => setCreateSprintOpen(false)}
          projectId={projectId}
        />
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
    <div className="kb-card kb-lift overflow-hidden rounded-3xl">
      {/* Row header */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-kanbot-surface-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-kanbot-primary dark:hover:bg-kanbot-dark-surface-elevated"
      >
        {isExpanded ? (
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-kanbot-muted dark:text-kanbot-dark-muted" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-kanbot-muted dark:text-kanbot-dark-muted" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-kanbot-text dark:text-kanbot-dark-text">{sprint.name}</span>
            <SprintStatusPill status={sprint.status} />
            {sprint.status === 'active' && isSprintOverdue(sprint) && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950/50 dark:text-red-400">
                Overdue
              </span>
            )}
          </div>
          {(startLabel || endLabel) && (
            <p className="mt-0.5 text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
              {startLabel ?? '?'} – {endLabel ?? '?'}
            </p>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-4 text-xs text-kanbot-muted sm:flex dark:text-kanbot-dark-muted">
          <span>
            <span className="font-semibold text-kanbot-text dark:text-kanbot-dark-text">{stats.doneTodos}</span>
            /{stats.totalTodos} done
          </span>
          {stats.totalPoints > 0 && (
            <span>
              <span className="font-semibold text-kanbot-text dark:text-kanbot-dark-text">{stats.donePoints}</span>
              /{stats.totalPoints} pts
            </span>
          )}
          <span
            className={cn(
              'font-semibold',
              sprint.status === 'completed' && 'text-green-600 dark:text-green-400',
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
  const {
    data: todos,
    isLoading: todosLoading,
    isError: todosError,
    error: todosErr,
    refetch: refetchTodos,
  } = useTodos(projectId, { sprintId: sprint.id });

  const stats =
    sprint.status === 'completed' && sprint.completedStats
      ? sprint.completedStats
      : sprint.stats;

  return (
    <div className="space-y-4 px-5 pb-5 pt-1">
      {/* Goal */}
      {sprint.goal && (
        <p className="text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
          <span className="font-medium text-kanbot-text dark:text-kanbot-dark-text">Goal: </span>
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

      {sprint.status === 'active' && todos && (
        <BurndownChart sprint={sprint} todos={todos} />
      )}

      {todos && todos.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadTextFile(`${sprint.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-todos.csv`, todosToCsv(todos), 'text/csv')}
          >
            Export todos CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const markdown = [
                `# ${sprint.name}`,
                '',
                `Status: ${sprint.status}`,
                sprint.goal ? `\nGoal: ${sprint.goal}` : '',
                '',
                `- Todos: ${stats.totalTodos}`,
                `- Completed: ${stats.doneTodos}`,
                `- Story points: ${stats.donePoints}/${stats.totalPoints}`,
                sprint.summary ? `\n## AI summary\n\n${sprint.summary.content}` : '',
                '\n## Todos\n',
                todosToMarkdown(todos),
              ].join('\n');
              downloadTextFile(`${sprint.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-summary.md`, markdown, 'text/markdown');
            }}
          >
            Export summary
          </Button>
        </div>
      )}

      {/* Progress bar */}
      {(stats.totalTodos > 0 || stats.totalPoints > 0) && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-kanbot-border dark:bg-kanbot-dark-border">
            <div
              className="h-full rounded-full bg-kanbot-primary"
              style={{
                width: `${stats.totalPoints > 0 ? donePointsPercent(stats) : doneTodosPercent(stats)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Todo list (compact) */}
      {todosLoading && (
        <div className="flex items-center gap-2 text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
          <Spinner className="h-4 w-4 text-kanbot-primary" />
          Loading todos…
        </div>
      )}
      {todosError && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          <span>Couldn't load sprint todos: {getErrorMessage(todosErr)}</span>
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={() => refetchTodos()}
          >
            Retry
          </Button>
        </div>
      )}
      {!todosLoading && !todosError && todos?.length === 0 && (
        <p className="text-xs text-kanbot-muted dark:text-kanbot-dark-muted">No todos in this sprint.</p>
      )}
      {!todosLoading && !todosError && todos && todos.length > 0 && (
        <div className="space-y-0.5">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-kanbot-surface-elevated dark:hover:bg-kanbot-dark-surface-elevated"
            >
              <TypeIcon type={todo.type} size="h-3.5 w-3.5" className="shrink-0" />
              <span className="font-mono text-[10px] text-kanbot-muted w-16 shrink-0 dark:text-kanbot-dark-muted">{todo.key}</span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate',
                  todo.status === 'done'
                    ? 'line-through text-kanbot-muted dark:text-kanbot-dark-muted'
                    : 'text-kanbot-text dark:text-kanbot-dark-text',
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
      <div className="rounded-xl border border-kanbot-border bg-kanbot-surface-elevated p-3 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface-elevated">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <SparklesIcon className="h-4 w-4 text-kanbot-primary" />
            <span className="text-xs font-semibold text-kanbot-muted dark:text-kanbot-dark-muted">AI Summary</span>
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
          <div className="prose prose-sm max-w-none text-kanbot-muted dark:text-kanbot-dark-muted dark:prose-invert">
            <ReactMarkdown>{sprint.summary.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
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

function VelocityChart({ sprints }: { sprints: Sprint[] }) {
  const completed = sprints
    .filter((sprint) => sprint.status === 'completed' && sprint.completedStats)
    .slice()
    .reverse()
    .slice(-6);
  if (completed.length === 0) return null;
  const values = completed.map((sprint) => sprint.completedStats?.donePoints ?? 0);
  const maxPoints = Math.max(1, ...values);
  const average = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);

  return (
    <section aria-label="Sprint velocity" className="kb-card rounded-3xl p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="kb-text text-base font-semibold">Sprint velocity</h2>
          <p className="kb-muted text-xs">Completed story points</p>
        </div>
        <span className="kb-chip">
          <span className="kb-muted">Average</span>
          <span className="font-semibold">{average} pts</span>
        </span>
      </div>
      <div className="flex h-44 items-stretch gap-3 overflow-x-auto">
        {completed.map((sprint, index) => {
          const points = values[index];
          const latest = index === completed.length - 1;
          return (
            <div key={sprint.id} className="flex min-w-14 flex-1 flex-col items-center gap-2">
              <span className="kb-text text-xs font-semibold">{points}</span>
              <div className="flex w-full max-w-14 flex-1 items-end overflow-hidden rounded-2xl bg-[var(--kb-soft)]">
                <div
                  role="img"
                  aria-label={`${sprint.name}: ${points} completed story points`}
                  className={cn(
                    'w-full rounded-2xl transition-[height] duration-300',
                    latest ? 'bg-kanbot-primary' : 'bg-kanbot-primary/40',
                  )}
                  style={{ height: `${Math.max(6, (points / maxPoints) * 100)}%` }}
                />
              </div>
              <span className="kb-muted max-w-20 truncate text-center text-xs">{sprint.name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BurndownChart({ sprint, todos }: { sprint: Sprint; todos: Todo[] }) {
  const startValue = sprint.startDate ?? sprint.startedAt?.slice(0, 10);
  const endValue = sprint.endDate;
  if (!startValue || !endValue || todos.length === 0) return null;

  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  const current = todayStart < start ? start : todayStart > end ? end : todayStart;
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const elapsedDays = Math.max(0, Math.round((current.getTime() - start.getTime()) / 86_400_000));
  const usesPoints = todos.some((todo) => todo.storyPoints !== null);
  const weight = (todo: (typeof todos)[number]) => (usesPoints ? todo.storyPoints ?? 0 : 1);
  const scope = todos.reduce((sum, todo) => sum + weight(todo), 0);
  if (scope === 0) return null;
  const days = Array.from({ length: elapsedDays + 1 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    const completed = todos.reduce((sum, todo) => {
      const completedDate = todo.completedAt?.slice(0, 10);
      return completedDate && completedDate >= startValue && completedDate <= dateKey
        ? sum + weight(todo)
        : sum;
    }, 0);
    return { date, remaining: Math.max(0, scope - completed), ideal: scope * (1 - index / totalDays) };
  });
  const width = 640;
  const height = 210;
  const left = 36;
  const right = 14;
  const top = 14;
  const bottom = 26;
  const x = (index: number) => left + (days.length <= 1 ? 0 : (index / (days.length - 1)) * (width - left - right));
  const y = (value: number) => height - bottom - (value / scope) * (height - top - bottom);
  const actualPoints = days.map((day, index) => `${x(index)},${y(day.remaining)}`).join(' ');
  const idealPoints = days.map((day, index) => `${x(index)},${y(day.ideal)}`).join(' ');
  const areaPath = `M${x(0)},${height - bottom} L${actualPoints.split(' ').join(' L')} L${x(days.length - 1)},${height - bottom} Z`;
  const finalDay = days[days.length - 1];
  const grid = [0, 0.5, 1];

  return (
    <section aria-label="Sprint burndown chart" className="rounded-2xl bg-[var(--kb-soft)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="kb-text text-sm font-semibold">Sprint burndown</h3>
          <p className="kb-muted text-xs">
            {usesPoints ? 'Remaining story points' : 'Remaining todos'}
          </p>
        </div>
        <span className="kb-chip bg-[var(--kb-surface)]">
          <span className="font-semibold">{finalDay.remaining}</span>
          <span className="kb-muted">remaining</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Actual remaining work compared with the ideal burndown"
      >
        {grid.map((g) => (
          <g key={g}>
            <line
              x1={left}
              x2={width - right}
              y1={y(scope * g)}
              y2={y(scope * g)}
              strokeDasharray={g === 0 ? undefined : '3 5'}
              className="stroke-[var(--kb-line)]"
            />
            <text x={left - 8} y={y(scope * g) + 4} textAnchor="end" className="fill-[var(--kb-muted)] text-[11px]">
              {Math.round(scope * g)}
            </text>
          </g>
        ))}
        <path d={areaPath} className="fill-kanbot-primary/10" />
        <polyline points={idealPoints} fill="none" strokeWidth="1.5" strokeDasharray="5 5" className="stroke-[var(--kb-muted)] opacity-60" />
        <polyline points={actualPoints} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-kanbot-primary" />
        <circle cx={x(days.length - 1)} cy={y(finalDay.remaining)} r="5" strokeWidth="3" className="fill-kanbot-primary stroke-[var(--kb-surface)]" />
        <text x={left} y={height - 6} className="fill-[var(--kb-muted)] text-[11px]">{startValue}</text>
        <text x={width - right} y={height - 6} textAnchor="end" className="fill-[var(--kb-muted)] text-[11px]">{endValue}</text>
      </svg>
      <div className="kb-muted mt-2 flex justify-end gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5"><span className="h-1 w-4 rounded-full bg-kanbot-primary" />Actual</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-current opacity-60" />Ideal</span>
      </div>
    </section>
  );
}

function SprintStatusPill({ status }: { status: Sprint['status'] }) {
  const config = {
    planned: { label: 'Planned', className: 'border border-kanbot-border bg-kanbot-surface-elevated text-kanbot-muted dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface-elevated dark:text-kanbot-dark-muted' },
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    completed: { label: 'Completed', className: 'bg-kanbot-surface-elevated text-kanbot-muted dark:bg-kanbot-dark-surface-elevated dark:text-kanbot-dark-muted' },
  }[status];
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', config.className)}>
      {config.label}
    </span>
  );
}

function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[var(--kb-soft)] px-3 py-3 text-center">
      <p className="kb-text text-xl font-bold">{value}</p>
      <p className="kb-muted text-xs">{label}</p>
    </div>
  );
}
