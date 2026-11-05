import { EmptyState } from '../../shared/components/EmptyState';
import { BoardIcon } from '../../shared/components/icons';
export function BoardPlaceholder() {
  return (
    <EmptyState
      icon={<BoardIcon className="h-7 w-7" />}
      title="Board"
      description="The board is the active sprint's Kanban view. It isn't built yet — it's coming in a later step."
    />
  );
}
