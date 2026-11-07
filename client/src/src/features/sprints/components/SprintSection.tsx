import { useRef, useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Sprint, Todo } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Spinner } from '../../../shared/components/Spinner';
import { Button } from '../../../shared/components/Button';
import {
  ChevronDownIcon,
  CalendarIcon,
  ChevronUpIcon,
  DotsVerticalIcon,
  PencilIcon,
  PlusIcon,
  SprintsIcon,
  TrashIcon,
} from '../../../shared/components/icons';
import { TodoRow, type TodoRowProps } from '../../backlog/components/TodoRow';
import { totalPoints } from '../../backlog/lib/backlogStats';
import { useTodos } from '../../backlog/hooks/useTodos';
import { useDeleteSprint } from '../hooks/useSprintMutations';
import { getErrorMessage } from '../../../lib/api-error';
import { createPortal } from 'react-dom';

export const BACKLOG_LIST_ID = 'backlog';

interface SprintSectionProps {
  sprint: Sprint;
  projectId: string;
  eligibleSprints: Sprint[];
  onEdit: (sprint: Sprint) => void;
  /** SPR-3: Called to open the StartSprintDialog. */
  onStart: (sprint: Sprint) => void;
  /** True when another sprint is already active — disables Start. */
  hasActiveSprint: boolean;
  onTodoOpen: (todo: Todo) => void;
  onAddTodo: () => void;
  onTodoDelete: (todo: Todo) => void;
  onMoveTo: (todo: Todo, sprintId: string | null, sourceSprintId: string | null) => void;
  onMoveToTop: (todo: Todo) => void;
  onMoveToBottom: (todo: Todo) => void;
}

/**
 * A collapsible planned-sprint section. Renders above the backlog on the
 * Backlog page (SPR-1). Uses `useDroppable` so the section body is a DnD
 * drop target when the user drags from the backlog or another sprint.
 *
 * Each section fetches its own todos via `useTodos(projectId, { sprintId })`.
 * This keeps data loading isolated and avoids a single giant query. The
 * SortableContext ID space is scoped to the sprint id.
 */
export function SprintSection({
  sprint,
  projectId,
  eligibleSprints,
  onEdit,
  onStart,
  hasActiveSprint,
  onTodoOpen,
  onAddTodo,
  onTodoDelete,
  onMoveTo,
  onMoveToTop,
  onMoveToBottom,
}: SprintSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const deleteSprint = useDeleteSprint(projectId);
  const {
    data: todos,
    isLoading: todosLoading,
    isError: todosError,
    error: todosErr,
    refetch: refetchTodos,
  } = useTodos(projectId, { sprintId: sprint.id });

  // Make the section body a droppable target so backlog todos can be dragged in.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: sprint.id,
    data: { sprintId: sprint.id, position: todos?.length ?? 0 },
  });

  // Stats derived from the loaded todos (mirrors the backlog stats bar approach).
  const points = todos ? totalPoints(todos) : sprint.stats.totalPoints;
  const count = todos ? todos.length : sprint.stats.totalTodos;

  const openMenu = () => {
    const btn = menuBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
    setMenuOpen(true);
  };

  const closeMenu = () => setMenuOpen(false);

  const handleConfirmDelete = () => {
    deleteSprint.mutate(sprint.id, {
      onSuccess: () => setConfirmDelete(false),
    });
  };

  const dateLabel = () => {
    if (sprint.startDate && sprint.endDate) {
      return `${formatDate(sprint.startDate)} – ${formatDate(sprint.endDate)}`;
    }
    if (sprint.startDate) return `From ${formatDate(sprint.startDate)}`;
    if (sprint.endDate) return `Until ${formatDate(sprint.endDate)}`;
    return null;
  };

  const sprintRowProps: Omit<TodoRowProps, 'todo'> = {
    onOpen: onTodoOpen,
    onDelete: onTodoDelete,
    sprints: eligibleSprints,
    onMoveTo: (t, targetSprintId) => onMoveTo(t, targetSprintId, sprint.id),
    onMoveToTop: (t) => onMoveToTop(t),
    onMoveToBottom: (t) => onMoveToBottom(t),
    sortingDisabled: false,
  };

  return (
    <div className="kb-card overflow-hidden rounded-[1.75rem]">
      {/* ── Sprint Header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${sprint.name}` : `Collapse ${sprint.name}`}
          className="kb-icon-btn h-8 w-8 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
        >
          {collapsed ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronUpIcon className="h-4 w-4" />
          )}
        </button>

        {/* Sprint name + goal */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-[color:var(--kb-text)]">{sprint.name}</span>
            <SprintStatusBadge status={sprint.status} />
            {dateLabel() && (
              <span className="inline-flex items-center gap-1 text-xs text-[color:var(--kb-muted)]"><CalendarIcon className="h-3 w-3" aria-hidden="true" />{dateLabel()}</span>
            )}
          </div>
          {sprint.goal && (
            <p className="mt-0.5 truncate text-[13px] text-[color:var(--kb-muted)]">{sprint.goal}</p>
          )}
        </div>

        {/* Stats + Start button */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 text-xs sm:flex">
            <span className="kb-pill kb-tone-neutral">{count} {count === 1 ? 'item' : 'items'}</span>
            {points > 0 && <span className="kb-pill kb-tone-neutral">{points} pts</span>}
          </div>
          {sprint.status === 'planned' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onStart(sprint)}
              disabled={hasActiveSprint}
              title={hasActiveSprint ? 'Another sprint is already active' : undefined}
            >
              <SprintsIcon className="h-3.5 w-3.5" />
              Start
            </Button>
          )}
        </div>

        {/* ⋮ Actions menu */}
        <button
          ref={menuBtnRef}
          type="button"
          aria-label={`Actions for ${sprint.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation();
            if (menuOpen) { closeMenu(); } else { openMenu(); }
          }}
          className="kb-icon-btn shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
        >
          <DotsVerticalIcon className="h-4 w-4" />
        </button>
      </div>

      {/* ── Sprint body (todos) ─────────────────────────────────────────── */}
      {!collapsed && (
        <div
          ref={setDropRef}
          className={cn(
            'mx-3 min-h-[3rem] space-y-2.5 rounded-[1.25rem] bg-[color:var(--kb-soft)] p-3 transition-colors',
            isOver && 'bg-[color:var(--kb-lav-bg)]',
          )}
          role="list"
          aria-label={`Todos in ${sprint.name}`}
        >
          {todosLoading && (
            <div className="flex items-center justify-center py-6">
              <Spinner className="h-5 w-5 text-[color:var(--kb-primary)]" />
              <span className="ml-2 text-sm text-[color:var(--kb-muted)]">Loading…</span>
            </div>
          )}

          {todosError && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-2 px-3 py-3 text-sm text-[color:var(--kb-rose-fg)]"
            >
              <span>Couldn't load todos: {getErrorMessage(todosErr)}</span>
              <Button
                variant="secondary"
                size="sm"
                className="ml-auto"
                onClick={() => refetchTodos()}
              >
                Retry
              </Button>
            </div>
          )}

          {!todosLoading && !todosError && todos && todos.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-1 py-6 text-center">
              <p className="text-sm font-medium text-[color:var(--kb-text)]">No todos in this sprint yet</p>
              <p className="text-xs text-[color:var(--kb-muted)]">Drag from the backlog or use the card menu.</p>
            </div>
          )}

          {!todosLoading && !todosError && todos && todos.length > 0 && (
            <SortableContext
              id={sprint.id}
              items={todos.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {todos.map((todo) => (
                <div key={todo.id} role="listitem">
                  <TodoRow todo={todo} {...sprintRowProps} />
                </div>
              ))}
            </SortableContext>
          )}
        </div>
      )}

      {/* ── Portal actions menu ─────────────────────────────────────────── */}
      {menuOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${sprint.name}`}
            style={{ top: menuPos.top, right: menuPos.right }}
            onClick={closeMenu}
            className="kb-menu fixed z-50 min-w-[12rem]"
          >
            <button
              role="menuitem"
              type="button"
              onClick={(e) => { e.stopPropagation(); closeMenu(); onEdit(sprint); }}
              className="kb-menu-item"
            >
              <PencilIcon className="h-4 w-4 text-[color:var(--kb-muted)]" />
              Edit sprint
            </button>

            {sprint.status === 'planned' && (
              <>
                <div className="my-1 border-t border-[color:var(--kb-line)]" />
                <button
                  role="menuitem"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    setConfirmDelete(true);
                  }}
                  className="kb-menu-item" data-danger="true"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete sprint
                </button>
              </>
            )}
          </div>,
          document.body,
        )}

      {/* ── Delete confirmation ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title={`Delete "${sprint.name}"?`}
        confirmLabel="Delete sprint"
        tone="danger"
        loading={deleteSprint.isPending}
      >
        <p>
          Deleting this sprint will move all its todos back to the{' '}
          <span className="font-semibold text-[color:var(--kb-text)]">backlog</span>. This
          action cannot be undone.
        </p>
        {deleteSprint.isError && (
          <p role="alert" className="mt-3 text-sm font-medium text-[color:var(--kb-rose-fg)]">
            {getErrorMessage(deleteSprint.error)}
          </p>
        )}
      </ConfirmDialog>

      {/* ── Quick-add placeholder inside sprint ─────────────────────────── */}
      {!collapsed && (
        <div className="px-5 py-3.5">
          <button
            type="button"
            onClick={onAddTodo}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] font-medium text-[color:var(--kb-muted)] hover:text-[color:var(--kb-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add todo to sprint
          </button>
        </div>
      )}
    </div>
  );
}

function SprintStatusBadge({ status }: { status: Sprint['status'] }) {
  if (status === 'planned') {
    return <span className="kb-pill kb-tone-lav">Planned</span>;
  }
  if (status === 'active') {
    return (
      <span className="kb-pill kb-tone-sage">
        <span aria-hidden="true" className="kb-dot-sage h-1.5 w-1.5 rounded-full" />
        Active
      </span>
    );
  }
  return null;
}

function formatDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD; we display it as a friendly short date.
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}
