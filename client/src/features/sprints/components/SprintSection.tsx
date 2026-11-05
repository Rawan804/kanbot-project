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
  onTodoDelete: (todo: Todo) => void;
  onMoveTo: (todo: Todo, sprintId: string | null, sourceSprintId: string | null) => void;
  onMoveToTop: (todo: Todo) => void;
  onMoveToBottom: (todo: Todo) => void;
}

export function SprintSection({
  sprint,
  projectId,
  eligibleSprints,
  onEdit,
  onStart,
  hasActiveSprint,
  onTodoOpen,
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
  const { data: todos, isLoading: todosLoading } = useTodos(projectId, {
    sprintId: sprint.id,
  });

  // Make the section body a droppable target so backlog todos can be dragged in.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: sprint.id,
    data: { sprintId: sprint.id },
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
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* ── Sprint Header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${sprint.name}` : `Collapse ${sprint.name}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
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
            <span className="text-sm font-semibold text-slate-900">{sprint.name}</span>
            <SprintStatusBadge status={sprint.status} />
            {dateLabel() && (
              <span className="text-xs text-slate-400">{dateLabel()}</span>
            )}
          </div>
          {sprint.goal && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{sprint.goal}</p>
          )}
        </div>

        {/* Stats + Start button */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-3 text-xs text-slate-400 sm:flex">
            <span>{count} {count === 1 ? 'item' : 'items'}</span>
            {points > 0 && <span>{points} pts</span>}
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
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
        >
          <DotsVerticalIcon className="h-4 w-4" />
        </button>
      </div>

      {/* ── Sprint body (todos) ─────────────────────────────────────────── */}
      {!collapsed && (
        <div
          ref={setDropRef}
          className={cn(
            'border-t border-slate-100 px-2 pb-2 pt-1 min-h-[3rem] transition-colors',
            isOver && 'bg-[#eef1ff]/60',
          )}
          role="list"
          aria-label={`Todos in ${sprint.name}`}
        >
          {todosLoading && (
            <div className="flex items-center justify-center py-6">
              <Spinner className="h-5 w-5 text-[#2f4bff]" />
              <span className="ml-2 text-sm text-slate-400">Loading…</span>
            </div>
          )}

          {!todosLoading && todos && todos.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-center">
              <p className="text-xs text-slate-400">No todos in this sprint yet.</p>
              <p className="text-xs text-slate-400">Drag from the backlog or use the row menu.</p>
            </div>
          )}

          {!todosLoading && todos && todos.length > 0 && (
            <SortableContext
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
            className="fixed z-50 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          >
            <button
              role="menuitem"
              type="button"
              onClick={(e) => { e.stopPropagation(); closeMenu(); onEdit(sprint); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <PencilIcon className="h-4 w-4 text-slate-400" />
              Edit sprint
            </button>

            {sprint.status === 'planned' && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  role="menuitem"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    setConfirmDelete(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 text-red-400" />
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
          <span className="font-semibold text-slate-900">backlog</span>. This
          action cannot be undone.
        </p>
        {deleteSprint.isError && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600">
            {getErrorMessage(deleteSprint.error)}
          </p>
        )}
      </ConfirmDialog>

      {/* ── Quick-add placeholder inside sprint ─────────────────────────── */}
      {!collapsed && (
        <div className="border-t border-slate-100 px-4 py-2">
          <button
            type="button"
            onClick={() => {
              /* Todo: open create dialog scoped to this sprint — Phase 2 */
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#2f4bff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff] rounded"
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
    return (
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
        Planned
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
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
