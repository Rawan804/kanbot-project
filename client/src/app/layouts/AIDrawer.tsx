import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types/api';
import { cn } from '../../shared/lib/cn';
import { Button } from '../../shared/components/Button';
import { Spinner } from '../../shared/components/Spinner';
import {
  BotIcon,
  PlusIcon,
  SparklesIcon,
  XIcon,
  BacklogIcon,
  SprintsIcon,
} from '../../shared/components/icons';
import { useAiStatus } from '../../features/ai/hooks/useAiQueries';
import { useChat } from '../../features/ai/hooks/useAiMutations';
import { getErrorMessage } from '../../lib/api-error';
import { GenerateTodosDialog } from '../../features/ai/components/GenerateTodosDialog';
import { PlanSprintDialog } from '../../features/ai/components/PlanSprintDialog';

interface AIDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The currently selected project id (null when on /projects). */
  projectId: string | undefined;
  /** Conversation messages — lifted to AppShell so they persist across navigation. */
  messages: ChatMessage[];
  onMessagesChange: (msgs: ChatMessage[]) => void;
}

/**
 * AI-1: Assistant side drawer.
 *
 * - Chat is project-scoped (projectId required to send messages).
 * - The complete conversation is sent on every request (stateless backend).
 * - Messages persist when the drawer is closed; reset when the project changes
 *   (handled in AppShell).
 * - Quick actions open AI-2 (Generate todos) or AI-3 (Plan sprint) dialogs.
 * - AI-4 (Summarize sprint) is accessed from the Board / Sprints pages directly.
 * - Mock AI badge shown when `mode === 'mock'`.
 */
export function AIDrawer({
  open,
  onClose,
  projectId,
  messages,
  onMessagesChange,
}: AIDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [draft, setDraft] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  const { data: aiStatus } = useAiStatus();
  const chat = useChat(projectId ?? '');
  const isMock = aiStatus?.mode === 'mock';

  // Focus management and keyboard handling.
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    // Focus the textarea rather than the panel itself so the user can type immediately.
    setTimeout(() => inputRef.current?.focus(), 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      trigger?.focus?.();
    };
  }, [open, onClose]);

  // Scroll to the bottom when new messages arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, chat.isPending]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || chat.isPending) return;
    if (!projectId) return;

    setChatError(null);
    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextMessages: ChatMessage[] = [...messages, userMsg];
    onMessagesChange(nextMessages);
    setDraft('');

    try {
      const response = await chat.mutateAsync({ messages: nextMessages });
      onMessagesChange([...nextMessages, response.message]);
    } catch (err) {
      setChatError(getErrorMessage(err));
    }
  };

  const newChat = () => {
    onMessagesChange([]);
    setChatError(null);
    setDraft('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!open) return null;

  const canChat = Boolean(projectId);

  return createPortal(
    <>
      <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0 bg-slate-900/40"
          aria-hidden="true"
          onClick={onClose}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="AI assistant"
          tabIndex={-1}
          className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl focus:outline-none"
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
            <div className="flex items-center gap-2">
              <BotIcon className="h-5 w-5 text-[#2f4bff]" />
              <span className="text-base font-semibold text-slate-900">AI Assistant</span>
              {isMock && (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  Mock AI
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={newChat}
                  aria-label="New chat"
                  title="New chat"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close AI assistant"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* ── Quick actions ──────────────────────────────────────────── */}
          {canChat && messages.length === 0 && (
            <div className="shrink-0 border-b border-slate-100 px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Quick actions
              </p>
              <div className="flex flex-wrap gap-2">
                <QuickActionButton
                  icon={<BacklogIcon className="h-3.5 w-3.5" />}
                  label="Generate todos"
                  onClick={() => setGenerateOpen(true)}
                />
                <QuickActionButton
                  icon={<SprintsIcon className="h-3.5 w-3.5" />}
                  label="Plan sprint"
                  onClick={() => setPlanOpen(true)}
                />
                <QuickActionButton
                  icon={<SparklesIcon className="h-3.5 w-3.5" />}
                  label="Summarize sprint"
                  onClick={() => {
                    // Guide the user to the Sprints or Board page.
                    onMessagesChange([
                      {
                        role: 'assistant',
                        content:
                          'To summarize a sprint, go to the **Sprints** page and expand any active or completed sprint, or use the **Board** page for the active sprint. You\'ll find a "Generate" button in the AI Summary section.',
                      },
                    ]);
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Message list ──────────────────────────────────────────── */}
          <div
            ref={scrollRef}
            data-lenis-prevent
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          >
            {/* No project selected */}
            {!canChat && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef1ff]">
                  <BotIcon className="h-6 w-6 text-[#2f4bff]" />
                </div>
                <p className="text-sm font-medium text-slate-700">Select a project</p>
                <p className="max-w-[18rem] text-xs text-slate-500">
                  Open a project from the sidebar to start using the AI assistant.
                </p>
              </div>
            )}

            {/* Empty conversation */}
            {canChat && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef1ff]">
                  <SparklesIcon className="h-6 w-6 text-[#2f4bff]" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Ask anything about your project
                </p>
                <p className="max-w-[18rem] text-xs text-slate-500">
                  Generate todos, plan sprints, track progress, or ask questions.
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}

            {/* Thinking indicator */}
            {chat.isPending && (
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef1ff]">
                  <BotIcon className="h-4 w-4 text-[#2f4bff]" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5">
                  <Spinner className="h-4 w-4 text-[#2f4bff]" />
                  <span className="text-sm text-slate-500">Thinking…</span>
                </div>
              </div>
            )}

            {/* Chat error */}
            {chatError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
              >
                <span className="font-medium">Error: </span>{chatError}
                <button
                  type="button"
                  className="ml-2 underline hover:no-underline"
                  onClick={() => setChatError(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* ── Disclaimer + input ─────────────────────────────────────── */}
          <footer className="shrink-0 border-t border-slate-200 px-4 py-3 space-y-2">
            <p className="text-[10px] text-slate-400 text-center">
              AI can make mistakes. Review before saving.
            </p>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                rows={1}
                disabled={!canChat || chat.isPending}
                placeholder={canChat ? 'Ask a question… (Enter to send)' : 'Select a project first'}
                aria-label="Message the assistant"
                className={cn(
                  'flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm transition-colors',
                  'placeholder:text-slate-400 focus:outline-none focus:ring-2',
                  'max-h-40 overflow-y-auto',
                  canChat
                    ? 'border-slate-300 focus:border-[#2f4bff] focus:ring-[#2f4bff]/20'
                    : 'border-slate-200 bg-slate-50 text-slate-400',
                )}
                onChange={(e) => {
                  setDraft(e.target.value);
                  // Auto-grow: reset height then set to scrollHeight.
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <Button
                size="md"
                onClick={() => void sendMessage()}
                disabled={!canChat || !draft.trim() || chat.isPending}
                loading={chat.isPending}
                aria-label="Send message"
                className="shrink-0"
              >
                <SparklesIcon className="h-4 w-4" />
              </Button>
            </div>
          </footer>
        </div>
      </div>

      {/* Quick-action dialogs rendered outside the drawer's z-index stack */}
      {projectId && (
        <>
          <GenerateTodosDialog
            open={generateOpen}
            onClose={() => setGenerateOpen(false)}
            projectId={projectId}
          />
          <PlanSprintDialog
            open={planOpen}
            onClose={() => setPlanOpen(false)}
            projectId={projectId}
          />
        </>
      )}
    </>,
    document.body,
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex items-start gap-2.5', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
          isUser
            ? 'bg-[#2f4bff] text-white'
            : 'bg-[#eef1ff] text-[#2f4bff]',
        )}
        aria-hidden="true"
      >
        {isUser ? 'You' : <BotIcon className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'rounded-tr-sm bg-[#2f4bff] text-white'
            : 'rounded-tl-sm bg-slate-100 text-slate-800',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0 prose-headings:my-2 prose-code:text-[#2f4bff] prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#2f4bff]/30 hover:bg-[#eef1ff] hover:text-[#2f4bff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
    >
      {icon}
      {label}
    </button>
  );
}
