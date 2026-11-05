import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ApiError } from '../../../lib/api-error';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Spinner } from '../../../shared/components/Spinner';
import {AlertTriangleIcon,PlusIcon, ProjectsIcon,} from '../../../shared/components/icons';
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organise your work into backlogs and sprints.
          </p>
        </div>
        <Button onClick={() => setFormDialog({ mode: 'create' })}>
          <PlusIcon className="h-4 w-4" />
          New project
        </Button>
      </div>

      {isLoading && <ProjectsLoading />}

      {isError && (
        <EmptyState
          tone="error"
          icon={<AlertTriangleIcon className="h-7 w-7" />}
          title="Couldn’t load projects"
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
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
              <span className="font-semibold text-slate-900">{deleting.name}</span>?
            </p>
            <p className="mt-2">
              This permanently deletes the project, its <span className="font-medium">todos</span>,
              and its <span className="font-medium">sprints</span>. This action cannot be undone.
            </p>
            {deleteProject.isError && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600">
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

function ProjectsLoading() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
      <Spinner className="h-7 w-7 text-[#2f4bff]" />
      <span className="ml-3 text-sm text-slate-500">Loading projects…</span>
    </div>
  );
}
