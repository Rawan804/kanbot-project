import { EmptyState } from '../../shared/components/EmptyState';
import { SprintsIcon } from '../../shared/components/icons';

/** Day 2 placeholder — the real sprints view is built later. Clearly labelled. */
export function SprintsPlaceholder() {
  return (
    <EmptyState
      icon={<SprintsIcon className="h-7 w-7" />}
      title="Sprints"
      description="Plan, start and complete sprints here. This view isn't built yet — it's coming in a later step."
    />
  );
}
