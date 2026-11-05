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

/**
 * AI-5: Get the AI mode (mock vs real model).
 * Called once at application level; cached with a long staleTime.
 */
export function getAiStatus(): Promise<AiStatusResponse> {
  return request<AiStatusResponse>('GET', '/ai/status');
}

/**
 * AI-1: Send the full conversation to the backend.
 * The server is stateless — the complete message history must be included
 * on every request.
 */
export function sendChat(
  projectId: string,
  body: ChatRequest,
): Promise<ChatResponse> {
  return request<ChatResponse>('POST', `/projects/${projectId}/ai/chat`, body);
}

/**
 * AI-2: Generate draft todos from a text prompt.
 * Returns unsaved DraftTodo objects; persisted by the caller via bulkCreateTodos.
 */
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

/**
 * AI-3: Suggest a sprint plan (goal + backlog todo ids + total points + reasoning).
 * The suggested sprint is NOT created automatically; the caller must confirm.
 */
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

/**
 * AI-4: Generate and save a sprint summary.
 * Works for active and completed sprints.
 * The summary is saved on the sprint; calling again replaces it.
 */
export function generateSprintSummary(sprintId: string): Promise<SprintSummaryResponse> {
  return request<SprintSummaryResponse>('POST', `/sprints/${sprintId}/ai/summary`);
}
