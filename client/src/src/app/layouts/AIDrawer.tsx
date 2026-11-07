import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, Todo } from '../../types/api';
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
  CalendarIcon,
} from '../../shared/components/icons';
import { useAiStatus } from '../../features/ai/hooks/useAiQueries';
import { useChat } from '../../features/ai/hooks/useAiMutations';
import { useGenerateSprintSummary } from '../../features/sprints/hooks/useSprintMutations';
import { useSprints } from '../../features/backlog/hooks/useSprints';
import { getErrorMessage } from '../../lib/api-error';
import { GenerateTodosDialog } from '../../features/ai/components/GenerateTodosDialog';
import { PlanSprintDialog } from '../../features/ai/components/PlanSprintDialog';
import { useTodos } from '../../features/backlog/hooks/useTodos';

interface AIDrawerProps {
  open: boolean;
  onClose: () => void;
  projectId: string | undefined;
  messages: ChatMessage[];
  onMessagesChange: (msgs: ChatMessage[]) => void;
  initialPrompt?: string;
}

/**
 * AI-1: Assistant side drawer.
 * Fully theme-aware with dark: variants.
 */
export function AIDrawer({
  open,
  onClose,
  projectId,
  messages,
  onMessagesChange,
  initialPrompt,
}: AIDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const onCloseRef = useRef(onClose);

  const [draft, setDraft] = useState(initialPrompt ?? '');
  const [chatError, setChatError] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  const {
    data: aiStatus,
    isError: aiStatusError,
    error: aiStatusErr,
    refetch: refetchAiStatus,
  } = useAiStatus();
  const chat = useChat(projectId ?? '');
  const { data: sprints, isLoading: sprintsLoading, isError: sprintsError, error: sprintsErr } =
    useSprints(projectId);
  const activeSprint = sprints?.find((sprint) => sprint.status === 'active');
  const { data: contextTodos } = useTodos(projectId, {
    sprintId: activeSprint?.id ?? 'backlog',
  });
  const { data: backlogTodos } = useTodos(projectId, { sprintId: 'backlog' });
  const { pathname } = useLocation();
  const generateSummary = useGenerateSprintSummary(projectId ?? '');
  const isMock = aiStatus?.mode === 'mock';
  const unestimatedTodos = (backlogTodos ?? []).filter((todo) => todo.storyPoints === null);

  const setSuggestedPrompt = (prompt: string) => {
    setDraft(prompt);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const pageSuggestion = pathname.endsWith('/board')
    ? 'Summarize the current sprint board. Identify progress, risks, and the most useful next actions.'
    : 'Review the backlog and suggest the highest-value next actions. Explain your reasoning.';
  const estimateSuggestion = unestimatedTodos.length > 0
    ? `Estimate the following unestimated backlog todos using Fibonacci story points (1, 2, 3, 5, 8, 13). Explain each estimate briefly and do not update any data:\n${unestimatedTodos.slice(0, 10).map((todo) => `- ${todo.key}: ${todo.title}`).join('\n')}`
    : 'Suggest a story-point estimate for the todo I describe, using Fibonacci values 1, 2, 3, 5, 8, or 13. Explain the estimate.';
  const standupSuggestion = buildStandupPrompt(activeSprint?.name, contextTodos ?? []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const activeElement = document.activeElement;
    const trigger = activeElement instanceof HTMLElement ? activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 50);

    const hasNestedDialog = () => document.querySelectorAll('[role="dialog"]').length > 1;
    const focusableItems = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          !element.hasAttribute('disabled') &&
          element.tabIndex >= 0 &&
          element.getClientRects().length > 0,
      );

    const onKeyDown = (e: KeyboardEvent) => {
      if (hasNestedDialog()) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusableItems();
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
      const target = e.target;
      if (
        hasNestedDialog() ||
        (target instanceof Node && panel.contains(target)) ||
        (target instanceof HTMLElement && target.closest('[role="dialog"]'))
      ) {
        return;
      }
      (inputRef.current ?? panel).focus();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      document.body.style.overflow = previousBodyOverflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);

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
    const nextMessages: ChatMessage[] = [...messages, userMsg].slice(-30);
    onMessagesChange(nextMessages);
    setDraft('');

    try {
      const response = await chat.mutateAsync({ messages: nextMessages });
      onMessagesChange([...nextMessages, response.message]);
    } catch (err) {
      setChatError(getErrorMessage(err));
    }
  };

  const retryMessage = async () => {
    if (chat.isPending || messages.at(-1)?.role !== 'user') return;
    setChatError(null);
    try {
      const response = await chat.mutateAsync({ messages: messages.slice(-30) });
      onMessagesChange([...messages, response.message]);
    } catch (err) {
      setChatError(getErrorMessage(err));
    }
  };

  const summarizeSprint = async () => {
    if (!projectId || generateSummary.isPending) return;
    setChatError(null);
    if (sprintsError) {
      setChatError(`Couldn't load sprints: ${getErrorMessage(sprintsErr)}`);
      return;
    }
    if (sprintsLoading || !sprints) return;
    const activeSprints = sprints.filter((sprint) => sprint.status === 'active');
    if (activeSprints.length > 1) {
      setChatError(
        `This project has ${activeSprints.length} active sprints. Resolve this inconsistency before generating a summary.`,
      );
      return;
    }
    const sprint =
      activeSprints[0] ??
      sprints
        .filter((candidate) => candidate.status === 'completed')
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0];
    if (!sprint) {
      setChatError('There is no active or completed sprint to summarize.');
      return;
    }
    try {
      const result = await generateSummary.mutateAsync(sprint.id);
      onMessagesChange([
        ...messages,
        {
          role: 'assistant',
          content: `## ${result.sprint.name} summary\n\n${result.summary.content}`,
        },
      ]);
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
          className="absolute inset-0 bg-slate-900/40 dark:bg-black/60"
          aria-hidden="true"
          onClick={onClose}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="AI assistant"
          tabIndex={-1}
          className="kanbot-drawer-enter absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l border-kanbot-border bg-kanbot-surface shadow-2xl focus:outline-none dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface"
        >
          {/* Header */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-kanbot-border px-4 dark:border-kanbot-dark-border">
            <div className="flex items-center gap-2">
              <BotIcon className="h-5 w-5 text-kanbot-primary dark:text-kanbot-dark-primary" />
              <span className="text-base font-semibold text-kanbot-text dark:text-kanbot-dark-text">
                AI Assistant
              </span>
              {isMock && (
                <span className="rounded-full border border-kanbot-border bg-kanbot-surface-elevated px-2 py-0.5 text-[10px] font-medium text-kanbot-muted dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface-elevated dark:text-kanbot-dark-muted">
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-kanbot-muted hover:bg-kanbot-surface-elevated hover:text-kanbot-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close AI assistant"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-kanbot-muted hover:bg-kanbot-surface-elevated hover:text-kanbot-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary dark:text-kanbot-dark-muted dark:hover:bg-kanbot-dark-surface-elevated dark:hover:text-kanbot-dark-text"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </header>

          {aiStatusError && (
            <div
              role="alert"
              className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
            >
              <span>Couldn't check AI availability: {getErrorMessage(aiStatusErr)}</span>
              <button
                type="button"
                onClick={() => void refetchAiStatus()}
                className="ml-auto shrink-0 font-semibold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary"
              >
                Retry
              </button>
            </div>
          )}

          {/* Quick actions */}
          {canChat && messages.length === 0 && (
            <div className="shrink-0 border-b border-kanbot-border/50 px-4 py-3 dark:border-kanbot-dark-border/50">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-kanbot-muted dark:text-kanbot-dark-muted">
                Quick actions
              </p>
              <div className="flex flex-wrap gap-2">
                <QuickActionButton
                  icon={<SparklesIcon className="h-3.5 w-3.5" />}
                  label="Suggest next steps"
                  onClick={() => setSuggestedPrompt(pageSuggestion)}
                />
                <QuickActionButton
                  icon={<CalendarIcon className="h-3.5 w-3.5" />}
                  label="Daily stand-up"
                  onClick={() => setSuggestedPrompt(standupSuggestion)}
                />
                <QuickActionButton
                  icon={<SparklesIcon className="h-3.5 w-3.5" />}
                  label="Estimate backlog"
                  onClick={() => setSuggestedPrompt(estimateSuggestion)}
                />
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
                  onClick={() => void summarizeSprint()}
                  disabled={sprintsLoading || generateSummary.isPending}
                  loading={generateSummary.isPending}
                />
              </div>
            </div>
          )}

          {/* Message list */}
          <div
            ref={scrollRef}
            data-lenis-prevent
            className="flex-1 space-y-4 overflow-y-auto bg-kanbot-background px-4 py-4 dark:bg-kanbot-dark-background"
          >
            {!canChat && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-kanbot-primary-soft dark:bg-kanbot-primary/15">
                  <BotIcon className="h-6 w-6 text-kanbot-primary dark:text-kanbot-dark-primary" />
                </div>
                <p className="text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text">
                  Select a project
                </p>
                <p className="max-w-[18rem] text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
                  Open a project from the sidebar to start using the AI assistant.
                </p>
              </div>
            )}

            {canChat && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-kanbot-primary-soft dark:bg-kanbot-primary/15">
                  <SparklesIcon className="h-6 w-6 text-kanbot-primary dark:text-kanbot-dark-primary" />
                </div>
                <p className="text-sm font-medium text-kanbot-text dark:text-kanbot-dark-text">
                  Ask anything about your project
                </p>
                <p className="max-w-[18rem] text-xs text-kanbot-muted dark:text-kanbot-dark-muted">
                  Generate todos, plan sprints, track progress, or ask questions.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}

            {chat.isPending && (
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kanbot-primary-soft dark:bg-kanbot-primary/15">
                  <BotIcon className="h-4 w-4 text-kanbot-primary dark:text-kanbot-dark-primary" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-kanbot-border bg-kanbot-surface px-4 py-2.5 shadow-sm dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface">
                  <Spinner className="h-4 w-4 text-kanbot-primary" />
                  <span className="text-sm text-kanbot-muted dark:text-kanbot-dark-muted">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            {chatError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
              >
                <span className="font-medium">Error: </span>
                {chatError}
                <div className="mt-2 flex items-center gap-3">
                  {messages.at(-1)?.role === 'user' && (
                    <button
                      type="button"
                      className="font-semibold underline hover:no-underline"
                      onClick={() => void retryMessage()}
                      disabled={chat.isPending}
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    className="underline hover:no-underline"
                    onClick={() => setChatError(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Input footer */}
          <footer className="shrink-0 border-t border-kanbot-border px-4 py-3 space-y-2 dark:border-kanbot-dark-border">
            <p className="text-[10px] text-kanbot-muted text-center dark:text-kanbot-dark-muted">
              AI can make mistakes. Review before saving.
            </p>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                rows={1}
                disabled={!canChat || chat.isPending}
                placeholder={canChat ? 'Ask a question... (Enter to send)' : 'Select a project first'}
                aria-label="Message the assistant"
                className={cn(
                  'flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm transition-colors',
                  'placeholder:text-kanbot-muted focus:outline-none focus:ring-2',
                  'max-h-40 overflow-y-auto',
                  canChat
                    ? 'border-kanbot-border bg-kanbot-surface text-kanbot-text focus:border-kanbot-primary focus:ring-kanbot-primary/20 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text dark:placeholder:text-kanbot-dark-muted dark:focus:border-kanbot-dark-primary dark:focus:ring-kanbot-dark-primary/20'
                    : 'border-kanbot-border bg-kanbot-surface-elevated text-kanbot-muted dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface-elevated dark:text-kanbot-dark-muted',
                )}
                onChange={(e) => {
                  setDraft(e.target.value);
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
  const [displayedContent, setDisplayedContent] = useState(() =>
    isUser ? message.content : '',
  );

  useEffect(() => {
    if (isUser) return;
    let offset = 0;
    const timer = window.setInterval(() => {
      offset = Math.min(message.content.length, offset + 8);
      setDisplayedContent(message.content.slice(0, offset));
      if (offset >= message.content.length) window.clearInterval(timer);
    }, 16);
    return () => window.clearInterval(timer);
  }, [isUser, message.content]);

  return (
    <div className={cn('flex items-start gap-2.5', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
          isUser
            ? 'bg-kanbot-primary text-white'
            : 'bg-kanbot-primary-soft text-kanbot-primary dark:bg-kanbot-primary/20 dark:text-kanbot-dark-primary',
        )}
        aria-hidden="true"
      >
        {isUser ? 'You' : <BotIcon className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'rounded-tr-sm bg-kanbot-primary text-white'
          : 'rounded-tl-sm border border-kanbot-border bg-kanbot-surface text-kanbot-text shadow-sm dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0 prose-headings:my-2 dark:prose-invert">
            <ReactMarkdown>{displayedContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function buildStandupPrompt(sprintName: string | undefined, todos: Todo[]): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, '0'),
    String(yesterday.getDate()).padStart(2, '0'),
  ].join('-');
  const completed = todos.filter(
    (todo) => todo.status === 'done' && todo.completedAt?.slice(0, 10) === yesterdayKey,
  );
  const active = todos.filter((todo) => todo.status === 'in_progress' || todo.status === 'in_review');
  const blockers = todos.filter((todo) => todo.priority === 'urgent' && todo.status !== 'done');
  const list = (items: typeof todos) =>
    items.length > 0 ? items.map((todo) => `${todo.key}: ${todo.title}`).join('; ') : 'None recorded';
  return [
    'Prepare a concise, factual daily stand-up. Do not infer activity that is not in the data.',
    `Sprint: ${sprintName ?? 'No active sprint'}.`,
    `Completed yesterday: ${list(completed)}.`,
    `Currently in progress or review: ${list(active)}.`,
    `Urgent unfinished items to check as blockers: ${list(blockers)}.`,
    'Call out that these are current todo records, not a complete activity history.',
  ].join('\n');
}

// ─── Quick Action Button ──────────────────────────────────────────────────────

function QuickActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  loading = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-kanbot-border bg-kanbot-surface px-3 py-1.5 text-xs font-medium text-kanbot-text transition-colors hover:border-kanbot-primary/30 hover:bg-kanbot-primary-soft hover:text-kanbot-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface dark:text-kanbot-dark-text dark:hover:border-kanbot-primary/40 dark:hover:bg-kanbot-primary/10 dark:hover:text-kanbot-dark-primary"
    >
      {loading ? <Spinner className="h-3.5 w-3.5 shrink-0" /> : icon}
      {label}
    </button>
  );
}
