import type { Todo } from '../../../types/api';

/**
 * Pure utilities for backlog reordering.
 *
 * The server's `POST /todos/:id/move` expects `position` = the 0-based index
 * in the *target* list after removing the dragged item.
 *
 * Example: [A, B, C, D], move A (index 0) to after C (index 2):
 *   After removal → [B, C, D]
 *   Target index  → 2  (A goes after C → between C and D)
 *   Server call   → { position: 2 }
 */

export function computeDropPosition(
  todos: Todo[],
  draggedId: string,
  overId: string,
): number {
  const overIndex = todos.findIndex((t) => t.id === overId);
  const draggedIndex = todos.findIndex((t) => t.id === draggedId);

  if (overIndex === -1 || draggedIndex === -1) {
    return draggedIndex === -1 ? 0 : draggedIndex;
  }

  const positionAfterRemoval = draggedIndex < overIndex ? overIndex - 1 : overIndex;
  return positionAfterRemoval;
}

/** Optimistic same-list reorder (splice-based, same as arrayMove). */
export function applyOptimisticReorder(
  todos: Todo[],
  draggedId: string,
  overId: string,
): Todo[] {
  const from = todos.findIndex((t) => t.id === draggedId);
  const to = todos.findIndex((t) => t.id === overId);
  if (from === -1 || to === -1 || from === to) return todos;

  const result = [...todos];
  const [dragged] = result.splice(from, 1);
  result.splice(to, 0, dragged);
  return result;
}

/**
 * Optimistic cross-container move (backlog ↔ sprint or sprint ↔ sprint).
 *
 * Removes the todo from `source` and inserts it at `position` in `target`.
 * If `overId` is provided, the todo is inserted at the over item's index;
 * otherwise `position` (clamped) is used.
 *
 * Returns new arrays for both lists — originals are not mutated.
 */
export function applyOptimisticMove(
  source: Todo[],
  target: Todo[],
  draggedId: string,
  overId: string | undefined,
  position: number,
): { newSource: Todo[]; newTarget: Todo[] } {
  const dragged = source.find((t) => t.id === draggedId);
  if (!dragged) {
    // Already not in source (e.g. same-list move treated as cross-container).
    return { newSource: source, newTarget: target };
  }

  const newSource = source.filter((t) => t.id !== draggedId);
  const insertAt = overId
    ? Math.max(0, target.findIndex((t) => t.id === overId))
    : Math.max(0, Math.min(position, target.length));

  const newTarget = [...target];
  newTarget.splice(insertAt, 0, dragged);

  return { newSource, newTarget };
}
