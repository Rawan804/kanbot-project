import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ApiError } from '../../../lib/api-error';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Spinner } from '../../../shared/components/Spinner';
import {
  AlertTriangleIcon,
  PlusIcon,
  ProjectsIcon,
  SearchIcon,
  XIcon,
} from '../../../shared/components/icons';
import type { ProjectWithStats } from '../../../types/api';
import { useProjects } from '../hooks/useProjects';
import { useDeleteProject } from '../hooks/useProjectMutations';
import { ProjectCard } from './ProjectCard';
import { ProjectFormDialog } from './ProjectFormDialog';

type FormDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; project: ProjectWithStats }
  | null;

export function ProjectsPage() {
  const { data: projects, isLoading, isError, error, refetch } = useProjects();
  const navigate = useNavigate();
  const location = useLocation();
  const deleteProject = useDeleteProject();

  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  const [deleting, setDeleting] = useState<ProjectWithStats | null>(null);
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const filteredProjects = (projects ?? []).filter(
    (project) =>
      !query ||
      project.name.toLowerCase().includes(query) ||
      project.key.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query),
  );

  const handleCreated = (projectId: string) => {
    navigate(`/projects/${projectId}/backlog`);
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    deleteProject.mutate(deleting.id, {
      onSuccess: () => {
        if (location.pathname.startsWith(`/projects/${deleting.id}`)) {
          navigate('/projects');
        }
        setDeleting(null);
      },
    });
  };

  const editingProject = formDialog?.mode === 'edit' ? formDialog.project : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-kanbot-text dark:text-kanbot-dark-text">
            Projects
          </h1>
          <p className="mt-1 text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
            Organise your work into backlogs and sprints.
          </p>
        </div>
        <Button onClick={() => setFormDialog({ mode: 'create' })}>
          <PlusIcon className="h-4 w-4" />
          New project
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center rounded-2xl border border-kanbot-border bg-kanbot-surface py-20 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface">
          <Spinner className="h-7 w-7 text-kanbot-primary" />
          <span className="ml-3 text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
            Loading projects...
          </span>
        </div>
      )}

      {isError && (
        <EmptyState
          tone="error"
          icon={<AlertTriangleIcon className="h-7 w-7" />}
          title="Couldn't load projects"
          description={error instanceof ApiError ? error.message : 'Something went wrong.'}
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {!isLoading && !isError && projects?.length === 0 && (
        <EmptyState
          icon={<ProjectsIcon className="h-7 w-7" />}
          title="No projects yet"
          description="Create your first project to start building a backlog and planning sprints."
          action={
            <Button onClick={() => setFormDialog({ mode: 'create' })}>
              <PlusIcon className="h-4 w-4" />
              New project
            </Button>
          }
        />
      )}

      {projects && projects.length > 0 && (
        <form
          role="search"
          onSubmit={(event) => event.preventDefault()}
          className="mb-5 max-w-lg"
        >
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kanbot-muted dark:text-kanbot-dark-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects by name, key or description..."
              aria-label="Search projects"
              className="h-10 w-full rounded-lg border border-kanbot-border bg-kanbot-surface pl-9 pr-3 text-sm text-kanbot-text placeholder:text-kanbot-muted focus:border-kanbot-primary focus:outline-none focus:ring-2 focus:ring-kanbot-primary/20 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text dark:placeholder:text-kanbot-dark-muted dark:focus:border-kanbot-dark-primary dark:focus:ring-kanbot-dark-primary/20"
            />
          </div>
        </form>
      )}

      {projects && projects.length > 0 && filteredProjects.length === 0 && (
        <EmptyState
          icon={<SearchIcon className="h-7 w-7" />}
          title="No projects match your search"
          description="Try a different search or clear the current one."
          action={
            <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
              <XIcon className="h-3.5 w-3.5" />
              Clear search
            </Button>
          }
        />
      )}

      {projects && projects.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => setFormDialog({ mode: 'edit', project })}
              onDelete={() => setDeleting(project)}
            />
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={formDialog !== null}
        project={editingProject}
        onClose={() => setFormDialog(null)}
        onCreated={handleCreated}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
        title="Delete project"
        confirmLabel="Delete project"
        tone="danger"
        loading={deleteProject.isPending}
      >
        {deleting && (
          <>
            <p>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-kanbot-text dark:text-kanbot-dark-text">
                {deleting.name}
              </span>
              ?
            </p>
            <p className="mt-2">
              This permanently deletes the project, its{' '}
              <span className="font-medium text-kanbot-text dark:text-kanbot-dark-text">todos</span>
              , and its{' '}
              <span className="font-medium text-kanbot-text dark:text-kanbot-dark-text">sprints</span>
              . This action cannot be undone.
            </p>
            {deleteProject.isError && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                {deleteProject.error instanceof ApiError
                  ? deleteProject.error.message
                  : 'Could not delete the project. Please try again.'}
              </p>
            )}
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
