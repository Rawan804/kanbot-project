import { describe, expect, it } from 'vitest';
import type { Todo } from '../../types/api';
import { todosToCsv, todosToMarkdown } from './exportTodos';

const todo: Todo = {
  id: 'todo-1',
  projectId: 'project-1',
  sprintId: null,
  key: 'KAN-1',
  title: 'Review "quoted" title',
  description: 'Details',
  type: 'task',
  status: 'in_progress',
  priority: 'high',
  storyPoints: 3,
  labels: ['frontend', 'review'],
  dueDate: '2026-04-04',
  order: 0,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-02T10:00:00.000Z',
  completedAt: null,
};

describe('todo exports', () => {
  it('creates escaped CSV containing the supported todo fields', () => {
    const csv = todosToCsv([todo]);
    expect(csv).toContain('"key","title"');
    expect(csv).toContain('"KAN-1","Review ""quoted"" title"');
    expect(csv).toContain('"frontend, review"');
  });

  it('creates a Markdown table safe for pipe and newline characters', () => {
    const markdown = todosToMarkdown([{ ...todo, title: 'First | row\nSecond' }]);
    expect(markdown).toContain('First \\| row Second');
    expect(markdown).toContain('| KAN-1 |');
  });
});
