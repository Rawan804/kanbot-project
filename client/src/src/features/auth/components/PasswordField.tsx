import { useState, type ComponentProps } from 'react';
import { TextField } from './TextField';

type Props = Omit<ComponentProps<typeof TextField>, 'type' | 'trailing'>;

export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-kanbot-muted transition-colors hover:bg-kanbot-surface-elevated hover:text-kanbot-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text"
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}
