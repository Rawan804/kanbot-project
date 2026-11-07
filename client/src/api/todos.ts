import { request } from './client';
import type {
  BulkCreateTodosRequest,
  BulkCreateTodosResponse,
  CreateTodoRequest,
  MoveTodoRequest,
  Todo,
  TodoListQuery,
  TodoListResponse,
  UpdateTodoRequest,
} from '../types/api';
function buildTodoQuery(params: TodoListQuery): string {
  const q = new URLSearchParams();
  if (params.sprintId !== undefined) q.set('sprintId', params.sprintId);
  if (params.status) q.set('status', params.status);
  if (params.priority) q.set('priority', params.priority);
  if (params.type) q.set('type', params.type);
  if (params.search) q.set('search', params.search);
  const str = q.toString();
  return str ? `?${str}` : '';
}
export function listTodos(
  projectId: string,
  params: TodoListQuery = {},
): Promise<Todo[]> {
  return request<TodoListResponse>(
    'GET',
    `/projects/${projectId}/todos${buildTodoQuery(params)}`,
  ).then((r) => r.todos);
}

export function createTodo(
  projectId: string,
  body: CreateTodoRequest,
): Promise<Todo> {
  return request<{ todo: Todo }>('POST', `/projects/${projectId}/todos`, body).then(
    (r) => r.todo,
  );
}

export function bulkCreateTodos(
  projectId: string,
  body: BulkCreateTodosRequest,
): Promise<Todo[]> {
  return request<BulkCreateTodosResponse>(
    'POST',
    `/projects/${projectId}/todos/bulk`,
    body,
  ).then((r) => r.todos);
}

export function getTodo(todoId: string): Promise<Todo> {
  return request<{ todo: Todo }>('GET', `/todos/${todoId}`).then((r) => r.todo);
}

export function updateTodo(todoId: string, body: UpdateTodoRequest): Promise<Todo> {
  return request<{ todo: Todo }>('PATCH', `/todos/${todoId}`, body).then((r) => r.todo);
}

export function deleteTodo(todoId: string): Promise<void> {
  return request<void>('DELETE', `/todos/${todoId}`);
}
export function moveTodo(todoId: string, body: MoveTodoRequest): Promise<Todo> {
  return request<{ todo: Todo }>('POST', `/todos/${todoId}/move`, body).then(
    (r) => r.todo,
  );
}
