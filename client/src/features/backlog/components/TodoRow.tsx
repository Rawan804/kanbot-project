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
        'kb-card kb-lift group relative flex items-center gap-2 rounded-2xl px-3.5 py-3',
        'transition-all duration-100',
        isDragging && 'z-50 opacity-60 ring-2 ring-kanbot-primary/50',
      )}
      {...attributes}
    >
      {/* Drag handle */}
      {!sortingDisabled ? (
        <button
          type="button"
          aria-label={`Drag to reorder ${todo.key}`}
          className={cn(
            'flex-shrink-0 cursor-grab touch-none rounded p-0.5',
            'text-kanbot-muted/40 hover:text-kanbot-muted dark:text-kanbot-dark-muted/40 dark:hover:text-kanbot-dark-muted',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary',
            'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
          {...listeners}
        >
          <GripVerticalIcon className="h-4 w-4" />
        </button>
      ) : (
        <span className="w-6 shrink-0" aria-hidden="true" />
      )}

      {/* Clickable row body */}
      <div
        className="flex min-w-0 flex-1 cursor-grab items-center gap-2 active:cursor-grabbing"
        role="button"
        tabIndex={0}
        aria-label={`Open ${todo.key}: ${todo.title}`}
        onPointerDown={(event) => listeners?.onPointerDown?.(event)}
        onClick={() => onOpen(todo)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(todo);
          }
        }}
      >
        <TypeIcon type={todo.type} size="h-4 w-4" className="shrink-0" />

        <span className="w-[4.5rem] shrink-0 font-mono text-[11px] font-medium text-kanbot-muted dark:text-kanbot-dark-muted">
          {todo.key}
        </span>

        <span className="min-w-0 flex-1 truncate text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text">
          {todo.title}
        </span>

        {todo.labels.length > 0 && (
          <div className="hidden max-w-48 shrink-0 items-center gap-1 sm:flex" aria-label="Labels">
            {todo.labels.slice(0, 3).map((label) => (
              <LabelChip key={label} label={label} />
            ))}
            {todo.labels.length > 3 && (
              <span className="text-[10px] text-kanbot-muted dark:text-kanbot-dark-muted">
                +{todo.labels.length - 3}
              </span>
            )}
          </div>
        )}

        <PriorityBadge priority={todo.priority} iconOnly />
      </div>

      {onInlineUpdate && <InlineTodoFields todo={todo} onSave={onInlineUpdate} />}

      <TodoDueDate dueDate={todo.dueDate} className="ml-auto" />

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
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
          'text-kanbot-muted hover:bg-kanbot-surface-elevated hover:text-kanbot-text',
          'dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary',
          'transition-colors',
        )}
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
            className="fixed z-[55] max-h-[calc(100dvh-1rem)] min-w-[12rem] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-kanbot-border bg-kanbot-surface py-1 shadow-xl dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface"
          >
            <button
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onOpen(todo);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-kanbot-text hover:bg-kanbot-surface-elevated dark:text-kanbot-dark-text dark:hover:bg-kanbot-dark-surface-elevated"
            >
              <PencilIcon className="h-4 w-4 text-kanbot-muted dark:text-kanbot-dark-muted" />
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
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-kanbot-text hover:bg-kanbot-surface-elevated dark:text-kanbot-dark-text dark:hover:bg-kanbot-dark-surface-elevated"
                >
                  <ArrowUpToLineIcon className="h-4 w-4 text-kanbot-muted dark:text-kanbot-dark-muted" />
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
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-kanbot-text hover:bg-kanbot-surface-elevated dark:text-kanbot-dark-text dark:hover:bg-kanbot-dark-surface-elevated"
                >
                  <ArrowDownToLineIcon className="h-4 w-4 text-kanbot-muted dark:text-kanbot-dark-muted" />
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
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-kanbot-text hover:bg-kanbot-surface-elevated dark:text-kanbot-dark-text dark:hover:bg-kanbot-dark-surface-elevated"
                  >
                    <MoveIcon className="h-4 w-4 text-kanbot-muted dark:text-kanbot-dark-muted" />
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
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-kanbot-text hover:bg-kanbot-surface-elevated dark:text-kanbot-dark-text dark:hover:bg-kanbot-dark-surface-elevated"
                    >
                      <MoveIcon className="h-4 w-4 text-kanbot-muted dark:text-kanbot-dark-muted" />
                      Move to sprint
                    </button>
                    {sprintSubmenuOpen && (
                      <div className="border-t border-kanbot-border dark:border-kanbot-dark-border">
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
                            className="flex w-full items-center gap-2 px-5 py-1.5 text-left text-xs text-kanbot-muted hover:bg-kanbot-surface-elevated dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated"
                          >
                            <span className="truncate">{s.name}</span>
                            {s.status === 'active' && (
                              <span className="ml-auto shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
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

            <div className="my-1 border-t border-kanbot-border dark:border-kanbot-dark-border" />

            <button
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete(todo);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <TrashIcon className="h-4 w-4 text-red-400 dark:text-red-400" />
              Delete
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
