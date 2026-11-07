import { Modal } from '../../shared/components/Modal';

const shortcuts = [
  ['Ctrl / ⌘ K', 'Open command palette'],
  ['C', 'Create a todo (on Backlog)'],
  ['/', 'Focus backlog search'],
  ['G, then B', 'Open the sprint board'],
  ['?', 'Show keyboard shortcuts'],
  ['Esc', 'Close the current dialog'],
];

export function ShortcutHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" size="sm">
      <dl className="divide-y divide-kanbot-border dark:divide-kanbot-dark-border">
        {shortcuts.map(([key, description]) => (
          <div key={key} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-kanbot-muted dark:text-kanbot-dark-muted">{description}</dt>
            <dd>
              <kbd className="rounded-md border border-kanbot-border bg-kanbot-surface-elevated px-2 py-1 font-mono text-xs text-kanbot-text dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface-elevated dark:text-kanbot-dark-text">
                {key}
              </kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
