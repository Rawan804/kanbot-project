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
const openDialogs: HTMLDivElement[] = [];
let previousBodyOverflow: string | null = null;
let lastFocusedElement: HTMLElement | null = null;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
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
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const trackFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const containingDialog = target.closest('[role="dialog"]');
      if (
        !containingDialog ||
        !containingDialog.hasAttribute('data-managed-dialog') ||
        openDialogs.some((dialog) => dialog === containingDialog)
      ) {
        lastFocusedElement = target;
      }
    };
    document.addEventListener('focusin', trackFocus);
    return () => document.removeEventListener('focusin', trackFocus);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    const activeElement = document.activeElement;
    triggerRef.current =
      activeElement instanceof HTMLElement && !panel.contains(activeElement)
        ? activeElement
        : lastFocusedElement;
    if (openDialogs.length === 0) previousBodyOverflow = document.body.style.overflow;
    openDialogs.push(panel);
    document.body.style.overflow = 'hidden';

    const getFocusableItems = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) =>
          !el.hasAttribute('disabled') &&
          el.tabIndex >= 0 &&
          el.getClientRects().length > 0,
      );
    const focusInitial = () => {
      const autofocused =
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
        panel.querySelector<HTMLElement>('[autofocus]') ??
        Array.from(
          panel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            'input, textarea, select',
          ),
        ).find((element) => element.autofocus);
      const first = autofocused ?? getFocusableItems()[0];
      (first ?? panel).focus();
    };
    focusInitial();

    const onKeyDown = (e: KeyboardEvent) => {
      if (openDialogs.at(-1) !== panel) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = getFocusableItems();
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (!panel.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (e: FocusEvent) => {
      if (openDialogs.at(-1) === panel && !panel.contains(e.target as Node)) {
        focusInitial();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      const dialogIndex = openDialogs.indexOf(panel);
      if (dialogIndex >= 0) openDialogs.splice(dialogIndex, 1);
      if (openDialogs.length === 0) {
        document.body.style.overflow = previousBodyOverflow ?? '';
        previousBodyOverflow = null;
      }
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
    };
  }, [open]);

  if (!open) return null;

  const sizeClass = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
  }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-[#2c2a35]/45 backdrop-blur-[2px] dark:bg-black/65 kanbot-fade-enter"
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        data-managed-dialog
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full shadow-2xl',
          'bg-[color:var(--kb-surface)] text-[color:var(--kb-text)] ring-1 ring-[color:var(--kb-line)]',
          'rounded-t-[1.75rem] sm:rounded-[1.75rem]',
          'max-h-[92vh] flex flex-col',
          'kanbot-dialog-enter',
          sizeClass,
        )}
      >
        <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-xl font-semibold tracking-tight text-[color:var(--kb-text)]"
            >
              {title}
            </h2>
            {description && (
              <p
                id={descId}
                className="mt-1 text-sm text-[color:var(--kb-muted)]"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="kb-icon-btn -mr-1 -mt-1 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kb-primary)]"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        <div data-lenis-prevent className="overflow-y-auto px-5 pb-5 sm:px-6">
          {children}
        </div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--kb-line)] px-5 py-4 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
