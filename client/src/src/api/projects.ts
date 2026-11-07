import { request } from './client';
import type {
  CreateProjectRequest,
  ProjectWithStats,
  UpdateProjectRequest,
} from '../types/api';
interface ProjectsResponse {
  projects: ProjectWithStats[];
}
interface ProjectResponse {
  project: ProjectWithStats;
}
export function listProjects(): Promise<ProjectWithStats[]> {
  return request<ProjectsResponse>('GET', '/projects').then((r) => r.projects);
}
export function createProject(body: CreateProjectRequest): Promise<ProjectWithStats> {
  return request<ProjectResponse>('POST', '/projects', body).then((r) => r.project);
}
export function getProject(projectId: string): Promise<ProjectWithStats> {
  return request<ProjectResponse>('GET', `/projects/${projectId}`).then((r) => r.project);
}
export function updateProject(
  projectId: string,
  body: UpdateProjectRequest,
): Promise<ProjectWithStats> {
  return request<ProjectResponse>('PATCH', `/projects/${projectId}`, body).then(
    (r) => r.project,
  );
}
export function deleteProject(projectId: string): Promise<void> {
  return request<void>('DELETE', `/projects/${projectId}`);
}
