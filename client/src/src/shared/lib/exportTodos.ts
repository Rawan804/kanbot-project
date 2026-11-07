import type { Todo } from '../../types/api';

const CSV_COLUMNS: (keyof Todo)[] = [
  'key',
  'title',
  'description',
  'type',
  'status',
  'priority',
  'storyPoints',
  'labels',
  'dueDate',
];

function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join(', ') : value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function todosToCsv(todos: Todo[]): string {
  return [
    CSV_COLUMNS.map(csvCell).join(','),
    ...todos.map((todo) =>
      CSV_COLUMNS.map((column) => csvCell(todo[column])).join(','),
    ),
  ].join('\r\n');
}

export function todosToMarkdown(todos: Todo[]): string {
  const header = '| Key | Title | Status | Priority | Points | Due date | Labels |';
  const divider = '| --- | --- | --- | --- | ---: | --- | --- |';
  const rows = todos.map((todo) => {
    const cells = [
      todo.key,
      todo.title,
      todo.status.replace('_', ' '),
      todo.priority,
      todo.storyPoints ?? '—',
      todo.dueDate ?? '—',
      todo.labels.join(', ') || '—',
    ];
    return `| ${cells.map((cell) => String(cell).replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ')} |`;
  });
  return [header, divider, ...rows].join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const file = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
