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
export function getSprintBoard(sprintId: string): Promise<SprintBoardResponse> {
  return request<SprintBoardResponse>('GET', `/sprints/${sprintId}/todos`);
}
export function createSprint(projectId: string, body: CreateSprintRequest): Promise<Sprint> {
  return request<{ sprint: Sprint }>('POST', `/projects/${projectId}/sprints`, body).then(
    (r) => r.sprint,
  );
}export function updateSprint(sprintId: string, body: UpdateSprintRequest): Promise<Sprint> {
  return request<{ sprint: Sprint }>('PATCH', `/sprints/${sprintId}`, body).then(
    (r) => r.sprint,
  );
}
export function deleteSprint(sprintId: string): Promise<void> {
  return request<void>('DELETE', `/sprints/${sprintId}`);
}
export function startSprint(
  sprintId: string,
  body: StartSprintRequest,
): Promise<Sprint> {
  return request<{ sprint: Sprint }>('POST', `/sprints/${sprintId}/start`, body).then(
    (r) => r.sprint,
  );
}
export function completeSprint(
  sprintId: string,
  body: CompleteSprintRequest,
): Promise<Sprint> {
  return request<{ sprint: Sprint }>('POST', `/sprints/${sprintId}/complete`, body).then(
    (r) => r.sprint,
  );
}
