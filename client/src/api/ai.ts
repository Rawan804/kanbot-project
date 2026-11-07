import { request } from './client';
import type {
  AiStatusResponse,
  ChatRequest,
  ChatResponse,
  GenerateTodosRequest,
  GenerateTodosResponse,
  PlanSprintRequest,
  PlanSprintResponse,
  SprintSummaryResponse,
} from '../types/api';


export function getAiStatus(): Promise<AiStatusResponse> {
  return request<AiStatusResponse>('GET', '/ai/status');
}


export function sendChat(
  projectId: string,
  body: ChatRequest,
): Promise<ChatResponse> {
  return request<ChatResponse>('POST', `/projects/${projectId}/ai/chat`, body);
}

export function generateTodos(
  projectId: string,
  body: GenerateTodosRequest,
): Promise<GenerateTodosResponse> {
  return request<GenerateTodosResponse>(
    'POST',
    `/projects/${projectId}/ai/generate-todos`,
    body,
  );
}


export function planSprint(
  projectId: string,
  body: PlanSprintRequest,
): Promise<PlanSprintResponse> {
  return request<PlanSprintResponse>(
    'POST',
    `/projects/${projectId}/ai/plan-sprint`,
    body,
  );
}


export function generateSprintSummary(sprintId: string): Promise<SprintSummaryResponse> {
  return request<SprintSummaryResponse>('POST', `/sprints/${sprintId}/ai/summary`);
}
