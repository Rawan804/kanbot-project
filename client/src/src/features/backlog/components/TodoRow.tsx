import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Sprint, Todo, UpdateTodoRequest } from '../../../types/api';
import { cn } from '../../../shared/lib/cn';
import { TypeIcon } from '../../../shared/components/TypeIcon';
import { PriorityBadge } from '../../../shared/components/PriorityBadge';
import { InlineTodoFields } from '../../../shared/components/InlineTodoFields';
import { LabelChip, TodoDueDate } from '../../../shared/components/TodoIndicators';
import { StatusBadge } from '../../../shared/components/StatusBadge';
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
  sprints?: Sprint[];
  onMoveTo?: (todo: Todo, sprintId: string | null) => void;
  sortingDisabled?: boolean;
  selected?: boolean;
  onSelect?: (todoId: string, selected: boolean) => void;
  onInlineUpdate?: (todo: Todo, changes: UpdateTodoRequest) => void;
}

/**
 * A compact, scannable row for one backlog todo.
 * BL-5: drag-and-drop reordering via dnd-kit/sortable.
 * BL-7: context menu for sprint moves and position controls.
 * Fully theme-aware with dark: variants.
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
  selected = false,
  onSelect,
  onInlineUpdate,
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
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const destinationSprints = sprints.filter((s) => s.id !== todo.sprintId);
  const isInSprint = todo.sprintId !== null;

  const openMenu = () => {
    setMenuOpen(true);
    setSprintSubmenuOpen(false);
  };

  useLayoutEffect(() => {
    if (!menuOpen) return;

    const updateMenuPosition = () => {
      const button = menuButtonRef.current;
      const menu = menuRef.current;
      if (!button || !menu) return;

      const buttonRect = button.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 4;
      const below = buttonRect.bottom + gap;
      const fitsBelow = below + menuRect.height <= window.innerHeight - viewportPadding;
      const fitsAbove = buttonRect.top - gap - menuRect.height >= viewportPadding;
      const left = Math.min(
        Math.max(buttonRect.right - menuRect.width, viewportPadding),
        window.innerWidth - menuRect.width - viewportPadding,
      );
      const top = fitsBelow
        ? below
        : fitsAbove
          ? buttonRect.top - gap - menuRect.height
          : Math.max(
              viewportPadding,
              Math.min(below, window.innerHeight - menuRect.height - viewportPadding),
            );

      setMenuPos({ top, left });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [menuOpen, sprintSubmenuOpen, destinationSprints.length]);

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'kb-card kb-lift group relative flex items-start gap-3 rounded-[1.25rem] p-4',
        isDragging
          ? 'z-50 opacity-60 ring-2 ring-[color:var(--kb-primary)]'
          : selected && 'ring-2 ring-[color:var(--kb-primary)]',
      )}
      {...attributes}
    >
      {/* Select + drag handle */}
      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            aria-label={`Select ${todo.key}`}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onSelect(todo.id, event.target.checked)}
            className="kb-checkbox"
          />
        )}
        {!sortingDisabled ? (
          <button
            type="button"
            aria-label={`Drag to reorder ${todo.key}`}
            className="kb-reveal flex-shrink-0 cursor-grab touch-none rounded-full p-0.5 text-[color:var(--kb-muted)] hover:text-[color:var(--kb-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
            {...listeners}
          >
            <GripVerticalIcon className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-5 shrink-0" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* Clickable card body */}
        <div
          className="cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <TypeIcon type={todo.type} size="h-4 w-4" className="shrink-0" />
            <span className="font-mono text-[11px] font-medium text-[color:var(--kb-muted)]">
              {todo.key}
            </span>
            <StatusBadge status={todo.status} />
          </div>
          <p className="mt-1.5 text-[15px] font-semibold leading-snug text-[color:var(--kb-text)]">
            {todo.title}
          </p>
          {todo.description.trim() && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[color:var(--kb-muted)]">
              {todo.description}
            </p>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={todo.priority} />
          {todo.labels.slice(0, 3).map((label) => (
            <LabelChip key={label} label={label} />
          ))}
          {todo.labels.length > 3 && (
            <span className="text-[11px] text-[color:var(--kb-muted)]">+{todo.labels.length - 3}</span>
          )}
          <PointsBadge points={todo.storyPoints} />
          <TodoDueDate dueDate={todo.dueDate} />
          {onInlineUpdate && (
            <div className="kb-reveal ml-auto">
              <InlineTodoFields todo={todo} onSave={onInlineUpdate} />
            </div>
          )}
        </div>
      </div>

      {/* Actions menu button */}
      <button
        ref={menuButtonRef}
        type="button"
        aria-label={`Actions for ${todo.key}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.stopPropagation();
          if (menuOpen) {
            setMenuOpen(false);
          } else {
            openMenu();
          }
        }}
        className="kb-icon-btn shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
      >
        <DotsVerticalIcon className="h-4 w-4" />
      </button>

      {/* Portal dropdown menu */}
      {menuOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${todo.key}`}
            style={{ top: menuPos.top, left: menuPos.left }}
            className="kb-menu fixed z-[55] max-h-[calc(100dvh-1rem)] min-w-[13rem] max-w-[calc(100vw-1rem)] overflow-y-auto"
          >
            <button
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onOpen(todo);
              }}
              className="kb-menu-item"
            >
              <PencilIcon className="h-4 w-4 text-[color:var(--kb-muted)]" />
              Edit details
            </button>

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
                  className="kb-menu-item"
                >
                  <ArrowUpToLineIcon className="h-4 w-4 text-[color:var(--kb-muted)]" />
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
                  className="kb-menu-item"
                >
                  <ArrowDownToLineIcon className="h-4 w-4 text-[color:var(--kb-muted)]" />
                  Move to bottom
                </button>
              </>
            )}

            {onMoveTo && (
              <>
                {isInSprint && (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onMoveTo(todo, null);
                    }}
                    className="kb-menu-item"
                  >
                    <MoveIcon className="h-4 w-4 text-[color:var(--kb-muted)]" />
                    Move to backlog
                  </button>
                )}

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
                      className="kb-menu-item"
                    >
                      <MoveIcon className="h-4 w-4 text-[color:var(--kb-muted)]" />
                      Move to sprint
                    </button>
                    {sprintSubmenuOpen && (
                      <div className="mt-1 border-t border-[color:var(--kb-line)] pt-1">
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
                            className="kb-menu-item pl-9 text-xs text-[color:var(--kb-muted)]"
                          >
                            <span className="truncate">{s.name}</span>
                            {s.status === 'active' && (
                              <span className="kb-pill kb-tone-sage ml-auto shrink-0">
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

            <div className="my-1 border-t border-[color:var(--kb-line)]" />

            <button
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete(todo);
              }}
              className="kb-menu-item" data-danger="true"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
