import { request } from './client';
import type {
  CompleteSprintRequest,
  CreateSprintRequest,
  Sprint,
  SprintBoardResponse,
  SprintListResponse,
  StartSprintRequest,
  UpdateSprintRequest,
} from '../types/api';

export function listSprints(projectId: string): Promise<Sprint[]> {
  return request<SprintListResponse>('GET', `/projects/${projectId}/sprints`).then(
    (r) => r.sprints,
  );
}

export function getSprint(sprintId: string): Promise<Sprint> {
  return request<{ sprint: Sprint }>('GET', `/sprints/${sprintId}`).then((r) => r.sprint);
}

/** GET /sprints/:id/todos — returns the sprint + its todos grouped by status column. */
export function getSprintBoard(sprintId: string): Promise<SprintBoardResponse> {
  return request<SprintBoardResponse>('GET', `/sprints/${sprintId}/todos`);
}

/** SPR-1: Create a planned sprint. */
export function createSprint(projectId: string, body: CreateSprintRequest): Promise<Sprint> {
  return request<{ sprint: Sprint }>('POST', `/projects/${projectId}/sprints`, body).then(
    (r) => r.sprint,
  );
}

/** SPR-2: Edit a planned sprint. */
export function updateSprint(sprintId: string, body: UpdateSprintRequest): Promise<Sprint> {
  return request<{ sprint: Sprint }>('PATCH', `/sprints/${sprintId}`, body).then(
    (r) => r.sprint,
  );
}

/**
 * SPR-2: Delete a planned sprint.
 * Server moves its todos back to backlog and returns 204.
 * Only planned sprints can be deleted.
 */
export function deleteSprint(sprintId: string): Promise<void> {
  return request<void>('DELETE', `/sprints/${sprintId}`);
}

/**
 * SPR-3: Start a planned sprint.
 * Only one active sprint can exist per project (server enforces with 409).
 */
export function startSprint(
  sprintId: string,
  body: StartSprintRequest,
): Promise<Sprint> {
  return request<{ sprint: Sprint }>('POST', `/sprints/${sprintId}/start`, body).then(
    (r) => r.sprint,
  );
}

/**
 * SPR-6: Complete the active sprint.
 * `moveUnfinishedTo` is either 'backlog' or a planned sprint id.
 */
export function completeSprint(
  sprintId: string,
  body: CompleteSprintRequest,
): Promise<Sprint> {
  return request<{ sprint: Sprint }>('POST', `/sprints/${sprintId}/complete`, body).then(
    (r) => r.sprint,
  );
}
