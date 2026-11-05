import { EmptyState } from '../../shared/components/EmptyState';
import { BacklogIcon } from '../../shared/components/icons';
export function BacklogPlaceholder() {
  return (
    <EmptyState
      icon={<BacklogIcon className="h-7 w-7" />}
      title="Backlog"
      description="The backlog holds every todo that isn't in a sprint. This view isn't built yet — it's coming in a later step."
    />
  );
}
