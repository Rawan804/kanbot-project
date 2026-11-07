import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { XIcon } from '../../shared/components/icons';

interface Notice {
  id: number;
  message: string;
}

export function MutationFeedback() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<Notice | null>(null);
  const nextId = useRef(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;

      const message = event.mutation.options.meta?.successMessage;
      setNotice({
        id: nextId.current++,
        message: typeof message === 'string' ? message : 'Action completed.',
      });

      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setNotice(null), 4000);
    });

    return () => {
      unsubscribe();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [queryClient]);

  if (!notice) return null;

  return (
    <div
      key={notice.id}
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl"
    >
      <span>{notice.message}</span>
      <button
        type="button"
        onClick={() => setNotice(null)}
        aria-label="Dismiss notification"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
