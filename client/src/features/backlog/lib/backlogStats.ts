import type {
  Todo,
  TodoPriority,
  TodoType,
  StoryPoints,
  TODO_PRIORITIES,
  TODO_TYPES,
} from '../../../types/api';

export function totalPoints(todos: Todo[]): number {
  return todos.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
}
export function countByPriority(
  todos: Todo[],
  priority: TodoPriority,
): number {
  return todos.filter((t) => t.priority === priority).length;
}
export function countByType(todos: Todo[], type: TodoType): number {
  return todos.filter((t) => t.type === type).length;
}
export function priorityCounts(
  todos: Todo[],
): Partial<Record<TodoPriority, number>> {
  const out: Partial<Record<TodoPriority, number>> = {};
  for (const t of todos) {
    out[t.priority] = (out[t.priority] ?? 0) + 1;
  }
  return out;
}
export function typeCounts(todos: Todo[]): Partial<Record<TodoType, number>> {
  const out: Partial<Record<TodoType, number>> = {};
  for (const t of todos) {
    out[t.type] = (out[t.type] ?? 0) + 1;
  }
  return out;
}
export function estimatedCount(todos: Todo[]): number {
  return todos.filter((t) => t.storyPoints !== null).length;
}
export type { TodoPriority, TodoType, StoryPoints, TODO_PRIORITIES, TODO_TYPES };
