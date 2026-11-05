import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { XIcon } from './icons';

/**
 * Accessible dialog.
 *
 * - Rendered in a portal at the end of <body> so it overlays everything.
 * - Closes on Escape and (optionally) on backdrop click.
 * - Traps Tab focus inside the panel and restores focus to the trigger on close.
 * - The scrollable body carries `data-lenis-prevent` so Lenis (SmoothScroll)
 *   doesn't hijack scrolling inside the dialog.
 * - On mobile it becomes a bottom sheet; on >=640px it is a centred card.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional subtitle rendered under the title. */
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Clicking the scrim closes the dialog. Default true. */
  closeOnBackdrop?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;

    // Remember what had focus (e.g. the button that opened us) to restore later.
    triggerRef.current = document.activeElement as HTMLElement | null;

    // Move focus into the dialog — prefer an [autofocus] field (forms), else the
    // first focusable element, else the panel itself (focusable via tabIndex=-1).
    const panel = panelRef.current;
    if (panel) {
      const autofocused = panel.querySelector<HTMLElement>('[autofocus]');
      const first = autofocused ?? panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    }

    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const container = panelRef.current;
        if (!container) return;
        const items = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      triggerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
  }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-white shadow-2xl',
          'rounded-t-2xl sm:rounded-2xl',
          'max-h-[92vh] flex flex-col',
          sizeClass,
        )}
      >
        <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        <div data-lenis-prevent className="overflow-y-auto px-5 pb-5 sm:px-6">
          {children}
        </div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
