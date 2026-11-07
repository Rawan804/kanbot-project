import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ProjectWithStats, Todo } from '../../types/api';
import { CalendarIcon, SearchIcon, SprintsIcon, BoardIcon, BacklogIcon } from '../../shared/components/icons';
import { Modal } from '../../shared/components/Modal';
import { useProjects } from '../../features/projects/hooks/useProjects';
import { useTodos } from '../../features/backlog/hooks/useTodos';

interface CommandPaletteProps {
  open: boolean;
  projectId?: string;
  onClose: () => void;
}

export function CommandPalette({ open, projectId, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const { data: todos } = useTodos(projectId, { sprintId: 'backlog' });

  const normalizedQuery = query.trim().toLowerCase();
  const matchingProjects = useMemo(
    () =>
      (projects ?? [])
        .filter((project) =>
          `${project.name} ${project.key}`.toLowerCase().includes(normalizedQuery),
        )
        .slice(0, 5),
    [projects, normalizedQuery],
  );
  const matchingTodos = useMemo(
    () =>
      (todos ?? [])
        .filter((todo) =>
          `${todo.key} ${todo.title} ${todo.labels.join(' ')}`
            .toLowerCase()
            .includes(normalizedQuery),
        )
        .slice(0, 7),
    [todos, normalizedQuery],
  );

  const goToProject = (project: ProjectWithStats) => {
    navigate(`/projects/${project.id}/backlog`);
    onClose();
  };
  const openTodo = (todo: Todo) => {
    navigate(`/projects/${todo.projectId}/backlog`, { state: { openTodoId: todo.id } });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quick search"
      description="Jump to a page, project, or todo."
      size="md"
    >
      <div className="space-y-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kanbot-muted dark:text-kanbot-dark-muted" />
          <input
            type="search"
            autoFocus
            data-autofocus=""
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects and todos..."
            aria-label="Search projects and todos"
            className="h-11 w-full rounded-xl border border-kanbot-border bg-kanbot-surface pl-10 pr-3 text-sm text-kanbot-text placeholder:text-kanbot-muted focus:border-kanbot-primary focus:outline-none focus:ring-2 focus:ring-kanbot-primary/20 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text dark:placeholder:text-kanbot-dark-muted"
          />
        </div>

        {projectId && (
          <section aria-label="Pages">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-kanbot-muted dark:text-kanbot-dark-muted">
              Pages
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              <PaletteAction icon={<BacklogIcon className="h-4 w-4" />} label="Open backlog" onClick={() => { navigate(`/projects/${projectId}/backlog`); onClose(); }} />
              <PaletteAction icon={<BoardIcon className="h-4 w-4" />} label="Open board" onClick={() => { navigate(`/projects/${projectId}/board`); onClose(); }} />
              <PaletteAction icon={<CalendarIcon className="h-4 w-4" />} label="Open My Week" onClick={() => { navigate(`/projects/${projectId}/week`); onClose(); }} />
              <PaletteAction icon={<SprintsIcon className="h-4 w-4" />} label="Open sprints" onClick={() => { navigate(`/projects/${projectId}/sprints`); onClose(); }} />
            </div>
          </section>
        )}

        {matchingProjects.length > 0 && (
          <section aria-label="Projects">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-kanbot-muted dark:text-kanbot-dark-muted">
              Projects
            </p>
            <div className="space-y-1">
              {matchingProjects.map((project) => (
                <PaletteAction
                  key={project.id}
                  icon={<span className="w-10 rounded bg-kanbot-primary-soft px-1.5 py-0.5 text-center text-[10px] font-bold text-kanbot-primary dark:bg-kanbot-primary/20 dark:text-kanbot-dark-primary">{project.key}</span>}
                  label={project.name}
                  onClick={() => goToProject(project)}
                />
              ))}
            </div>
          </section>
        )}

        {matchingTodos.length > 0 && (
          <section aria-label="Todos">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-kanbot-muted dark:text-kanbot-dark-muted">
              Todos in current project
            </p>
            <div className="space-y-1">
              {matchingTodos.map((todo) => (
                <PaletteAction
                  key={todo.id}
                  icon={<span className="w-14 shrink-0 font-mono text-[10px] text-kanbot-muted dark:text-kanbot-dark-muted">{todo.key}</span>}
                  label={todo.title}
                  onClick={() => openTodo(todo)}
                />
              ))}
            </div>
          </section>
        )}

        {normalizedQuery && matchingProjects.length === 0 && matchingTodos.length === 0 && (
          <p className="py-4 text-center text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
            No matching projects or todos.
          </p>
        )}
        <p className="text-center text-[10px] text-kanbot-muted dark:text-kanbot-dark-muted">
          Press Esc to close · Ctrl/⌘ K to open
        </p>
      </div>
    </Modal>
  );
}

function PaletteAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-kanbot-text transition-colors hover:bg-kanbot-surface-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-text dark:hover:bg-kanbot-dark-surface-elevated"
    >
      {icon}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}
