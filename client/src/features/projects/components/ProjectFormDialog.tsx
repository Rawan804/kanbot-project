import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, fieldErrors } from '../../../lib/api-error';
import { Button } from '../../../shared/components/Button';
import { Modal } from '../../../shared/components/Modal';
import { TextArea } from '../../../shared/components/TextArea';
import { TextField } from '../../../shared/components/TextField';
import { AlertTriangleIcon } from '../../../shared/components/icons';
import type { CreateProjectRequest, ProjectWithStats } from '../../../types/api';
import { useCreateProject, useUpdateProject } from '../hooks/useProjectMutations';
import { projectSchema, type ProjectFormValues } from '../schemas';

interface ProjectFormDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (projectId: string) => void;
  project?: ProjectWithStats | null;
}
export function ProjectFormDialog({ open, onClose, onCreated, project }: ProjectFormDialogProps) {
  const isEdit = Boolean(project);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit project' : 'New project'}
      description={isEdit ? undefined : 'Create a project to organise its backlog and sprints.'}
    >
      {/* `key` guarantees a fresh instance if the project changes while open. */}
      <ProjectForm
        key={project?.id ?? 'new'}
        project={project}
        onClose={onClose}
        onCreated={onCreated}
      />
    </Modal>
  );
}

interface ProjectFormProps {
  project?: ProjectWithStats | null;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

function ProjectForm({ project, onClose, onCreated }: ProjectFormProps) {
  const isEdit = Boolean(project);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? '',
      key: project?.key ?? '',
      description: project?.description ?? '',
    },
  });
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = form;
  const keyValue = useWatch({ control, name: 'key' }) ?? '';
  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const body: CreateProjectRequest = {
      name: values.name.trim(),
      key: values.key.trim() ? values.key.trim().toUpperCase() : undefined,
      description: values.description,
    };

    try {
      if (project) {
        await updateProject.mutateAsync({ projectId: project.id, body });
      } else {
        const created = await createProject.mutateAsync(body);
        onCreated(created.id);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const serverFieldErrors = fieldErrors(err);

        if (err.status === 409) {
          // Duplicate project key — surface under the key field.
          setError('key', { message: serverFieldErrors.key ?? err.message });
          return;
        }
        if (err.code === 'VALIDATION_ERROR' && Object.keys(serverFieldErrors).length > 0) {
          for (const [field, message] of Object.entries(serverFieldErrors)) {
            if (field === 'name' || field === 'key' || field === 'description') {
              setError(field as keyof ProjectFormValues, { message });
            }
          }
          return;
        }
        setFormError(err.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      {formError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>{formError}</span>
        </div>
      )}

      <TextField
        label="Name"
        autoFocus
        placeholder="e.g. Mobile app"
        autoComplete="off"
        aria-invalid={Boolean(errors.name)}
        error={errors.name?.message}
        {...register('name')}
      />

      <TextField
        label="Key"
        name="key"
        value={keyValue}
        onChange={(e) => {
          setValue('key', e.target.value.toUpperCase(), { shouldDirty: true });
          clearErrors('key');
        }}
        onBlur={() => form.trigger('key')}
        placeholder="e.g. MOB"
        maxLength={6}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={Boolean(errors.key)}
        error={errors.key?.message}
        hint="2–6 letters. Leave blank to auto-generate from the name."
      />

      <TextArea
        label="Description"
        rows={3}
        maxLength={500}
        placeholder="What is this project about?"
        aria-invalid={Boolean(errors.description)}
        error={errors.description?.message}
        hint="Optional, up to 500 characters."
        {...register('description')}
      />

      <div className="mt-2 flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          loadingText={isEdit ? 'Saving…' : 'Creating…'}
        >
          {isEdit ? 'Save changes' : 'Create project'}
        </Button>
      </div>
    </form>
  );
}
