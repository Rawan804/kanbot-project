import { useState } from 'react';
import type { Todo, UpdateTodoRequest } from '../../types/api';
import { Button } from './Button';
import { PointsBadge, PointsSelect } from './PointsSelect';
import { CheckIcon, PencilIcon, XIcon } from './icons';

export function InlineTodoFields({
  todo,
  onSave,
}: {
  todo: Todo;
  onSave: (todo: Todo, changes: UpdateTodoRequest) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [editingPoints, setEditingPoints] = useState(false);

  const saveTitle = () => {
    const updatedTitle = title.trim();
    if (!updatedTitle || updatedTitle.length > 200) return;
    if (updatedTitle !== todo.title) onSave(todo, { title: updatedTitle });
    setEditingTitle(false);
  };

  return (
    <div
      className="flex min-w-0 items-center gap-1.5"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {editingTitle ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            saveTitle();
          }}
        >
          <input
            autoFocus
            aria-label={`Edit title for ${todo.key}`}
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setTitle(todo.title);
                setEditingTitle(false);
              }
            }}
            className="kb-input h-8 min-w-0 flex-1 px-3 text-xs"
          />
          <button
            type="submit"
            disabled={!title.trim() || title.trim() === todo.title}
            aria-label={`Save title for ${todo.key}`}
            className="kb-icon-btn h-8 w-8 text-[color:var(--kb-sage-fg)] hover:bg-[color:var(--kb-sage-bg)] hover:text-[color:var(--kb-sage-fg)] disabled:opacity-40"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Cancel title edit for ${todo.key}`}
            onClick={() => {
              setTitle(todo.title);
              setEditingTitle(false);
            }}
            className="kb-icon-btn h-8 w-8"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          title="Edit title"
          aria-label={`Edit title for ${todo.key}`}
          onClick={() => {
            setTitle(todo.title);
            setEditingTitle(true);
          }}
          className="kb-icon-btn h-8 w-8 shrink-0 hover:text-[color:var(--kb-primary)]"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
      )}

      {editingPoints ? (
        <div className="kb-menu absolute left-2 top-full z-20 p-2">
          <PointsSelect
            value={todo.storyPoints}
            onChange={(storyPoints) => {
              onSave(todo, { storyPoints });
              setEditingPoints(false);
            }}
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          title="Edit story points"
          aria-label={`Edit story points for ${todo.key}`}
          className="h-8 min-w-8 px-1.5"
          onClick={() => setEditingPoints(true)}
        >
          <PointsBadge points={todo.storyPoints} />
          {todo.storyPoints === null && <span className="text-[10px]">Pts</span>}
        </Button>
      )}
    </div>
  );
}
