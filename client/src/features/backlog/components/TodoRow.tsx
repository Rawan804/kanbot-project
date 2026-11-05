import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Sprint, Todo } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { TypeIcon } from '../../../shared/components/TypeIcon';
import { PriorityBadge } from '../../../shared/components/PriorityBadge';
import { PointsBadge } from '../../../shared/components/PointsSelect';
import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  DotsVerticalIcon,
  GripVerticalIcon,
  MoveIcon,
  PencilIcon,
  TrashIcon,
} from '../../../shared/components/icons';

export interface TodoRowProps {
  todo: Todo;
  onOpen: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onMoveToTop?: (todo: Todo) => void;
  onMoveToBottom?: (todo: Todo) => void;
  /** BL-7: available destination sprints (planned + active). */
  sprints?: Sprint[];
  onMoveTo?: (todo: Todo, sprintId: string | null) => void;
  /** When true, drag handle is hidden and sorting is disabled (filters active). */
  sortingDisabled?: boolean;
}

/**
 * A compact, scannable row for one backlog todo.
 *
 * BL-5: Uses @dnd-kit/sortable to provide drag-and-drop reordering.
 *   The useSortable hook provides `attributes`, `listeners`, and `setNodeRef`
 *   that wire up the DnD context. We attach `listeners` only to the drag handle
 *   (GripVertical icon), not the whole row — so clicking a button or text never
 *   accidentally starts a drag.
 *
 *   When `sortingDisabled` is true (filters active), the handle is hidden and
 *   the sortable item is still mounted (so the list renders) but dragging is
 *   prevented by removing the listeners.
 *
 * BL-7: The ⋮ menu now includes "Move to sprint" sub-items and "Move to backlog"
 *   when the todo is in a sprint. These call `onMoveTo(todo, sprintId|null)`.
 *
 * Accessibility: "Move to top" and "Move to bottom" keyboard-accessible actions
 *   are available in the ⋮ menu (BL-5 requirement). They are hidden when
 *   `sortingDisabled` is true (filters active — position would be wrong).
 *
 * Layout (left → right):
 *   [⠿ drag handle] [type icon] [key] [title…] [labels] [points] [priority] [⋮]
 */
export function TodoRow({
  todo,
  onOpen,
  onDelete,
  onMoveToTop,
  onMoveToBottom,
  sprints = [],
  onMoveTo,
  sortingDisabled = false,
}: TodoRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [sprintSubmenuOpen, setSprintSubmenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const openMenu = () => {
    const btn = menuButtonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
    setMenuOpen(true);
    setSprintSubmenuOpen(false);
  };

  // Close on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !menuButtonRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  // Available sprint destinations: exclude the current sprint.
  const destinationSprints = sprints.filter((s) => s.id !== todo.sprintId);
  const isInSprint = todo.sprintId !== null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-2 rounded-lg border border-transparent px-2 py-2',
        'transition-all duration-100',
        isDragging
          ? 'z-50 opacity-50 border-[#2f4bff]/30 bg-[#eef1ff] shadow-lg'
          : 'hover:border-slate-200 hover:bg-white hover:shadow-sm',
      )}
      {...attributes}
    >
      {/* Drag handle — BL-5.
          `listeners` from useSortable are attached here, not to the whole row,
          so accidental drags from text selection or button clicks are prevented.
          Hidden when sorting is disabled (filters active). */}
      {!sortingDisabled ? (
        <button
          type="button"
          aria-label={`Drag to reorder ${todo.key}`}
          className={cn(
            'flex-shrink-0 cursor-grab touch-none rounded p-0.5',
            'text-slate-300 hover:text-slate-500',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]',
            'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
          {...listeners}
        >
          <GripVerticalIcon className="h-4 w-4" />
        </button>
      ) : (
        // Spacer keeps the row layout stable when handle is hidden.
        <span className="w-6 shrink-0" aria-hidden="true" />
      )}

      {/* Clickable row body — opens details */}
      <div
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
        role="button"
        tabIndex={0}
        aria-label={`Open ${todo.key}: ${todo.title}`}
        onClick={() => onOpen(todo)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(todo);
          }
        }}
      >
        {/* Type icon */}
        <TypeIcon type={todo.type} size="h-4 w-4" className="shrink-0" />

        {/* Key */}
        <span className="w-[4.5rem] shrink-0 font-mono text-[11px] font-medium text-slate-400">
          {todo.key}
        </span>

        {/* Title */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
          {todo.title}
        </span>

        {/* Labels — hidden on narrow screens */}
        {todo.labels.length > 0 && (
          <div className="hidden shrink-0 items-center gap-1 xl:flex" aria-label="Labels">
            {todo.labels.slice(0, 3).map((label) => (
              <span
                key={label}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
              >
                {label}
              </span>
            ))}
            {todo.labels.length > 3 && (
              <span className="text-[10px] text-slate-400">+{todo.labels.length - 3}</span>
            )}
          </div>
        )}

        {/* Story points */}
        <PointsBadge points={todo.storyPoints} />

        {/* Priority */}
        <PriorityBadge priority={todo.priority} iconOnly />
      </div>

      {/* Actions menu button (⋮) */}
      <button
        ref={menuButtonRef}
        type="button"
        aria-label={`Actions for ${todo.key}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.stopPropagation();
          if (menuOpen) { setMenuOpen(false); } else { openMenu(); }
        }}
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
          'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]',
          'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity',
        )}
      >
        <DotsVerticalIcon className="h-4 w-4" />
      </button>

      {/* Portal dropdown */}
      {menuOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${todo.key}`}
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-50 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          >
            {/* Edit */}
            <button
              role="menuitem"
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpen(todo); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <PencilIcon className="h-4 w-4 text-slate-400" />
              Edit details
            </button>

            {/* ── BL-5 keyboard alternatives — only when not filtered ── */}
            {!sortingDisabled && (
              <>
                <button
                  role="menuitem"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onMoveToTop?.(todo);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <ArrowUpToLineIcon className="h-4 w-4 text-slate-400" />
                  Move to top
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onMoveToBottom?.(todo);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <ArrowDownToLineIcon className="h-4 w-4 text-slate-400" />
                  Move to bottom
                </button>
              </>
            )}

            {/* ── BL-7 Sprint move actions ── */}
            {onMoveTo && (
              <>
                {/* Move to backlog (only if currently in a sprint) */}
                {isInSprint && (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onMoveTo(todo, null);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <MoveIcon className="h-4 w-4 text-slate-400" />
                    Move to backlog
                  </button>
                )}

                {/* Move to sprint — expand/collapse sub-list */}
                {destinationSprints.length > 0 && (
                  <div>
                    <button
                      role="menuitem"
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={sprintSubmenuOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSprintSubmenuOpen((v) => !v);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <MoveIcon className="h-4 w-4 text-slate-400" />
                      Move to sprint
                    </button>
                    {sprintSubmenuOpen && (
                      <div className="border-t border-slate-100">
                        {destinationSprints.map((s) => (
                          <button
                            key={s.id}
                            role="menuitem"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(false);
                              onMoveTo(todo, s.id);
                            }}
                            className="flex w-full items-center gap-2 px-5 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
                          >
                            <span className="truncate">{s.name}</span>
                            {s.status === 'active' && (
                              <span className="ml-auto shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                                active
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Divider before destructive action */}
            <div className="my-1 border-t border-slate-100" />

            {/* Delete */}
            <button
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete(todo);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4 text-red-400" />
              Delete
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
