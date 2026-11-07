
import type { ReactNode } from 'react';

type AlertTone = 'error' | 'info';

interface Props {
  tone?: AlertTone;
  children?: ReactNode;
}

const alertStyles: Record<AlertTone, string> = {
  error:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',

  info:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300',
};

function AlertIcon({ tone }: { tone: AlertTone }) {
  if (tone === 'error') {
    return (
      <svg
        className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        />
      </svg>
    );
  }

return (
  <svg
    className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
    />
  </svg>
);
}

export function FormAlert({
  tone = 'error',
  children,
}: Props) {
  if (children == null || children === false || children === '') {
    return null;
  }

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`
        mb-4 flex items-start gap-3
        rounded-xl border p-3.5
        text-sm leading-relaxed
        ${alertStyles[tone]}
      `}
    >
      <AlertIcon tone={tone} />

      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
