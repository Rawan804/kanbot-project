import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import type { ChatMessage } from '../../types/api';
import { BacklogIcon, BoardIcon, CalendarIcon, SprintsIcon } from '../../shared/components/icons';
import { cn } from '../../shared/lib/cn';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useSelectedProjectId } from '../hooks/useSelectedProjectId';
import { CommandPalette } from './CommandPalette';
import { ShortcutHelpDialog } from './ShortcutHelpDialog';

const AIDrawer = lazy(() =>
  import('./AIDrawer').then((module) => ({ default: module.AIDrawer })),
);

/**
 * AppShell owns the AI conversation state so the chat is preserved while
 * navigating between pages. The conversation resets when the user switches
 * to a different project.
 */
export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const [aiPrompt, setAiPrompt] = useState<{ key: number; text: string } | null>(null);
  const projectId = useSelectedProjectId();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const gPressedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const handleAIRequest = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail: unknown = event.detail;
      if (
        typeof detail !== 'object' ||
        detail === null ||
        !('prompt' in detail) ||
        typeof detail.prompt !== 'string'
      ) {
        return;
      }
      setAiPrompt({ key: Date.now(), text: detail.prompt });
      setAiOpen(true);
    };
    window.addEventListener('kanbot:ai-prompt', handleAIRequest);
    return () => window.removeEventListener('kanbot:ai-prompt', handleAIRequest);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setCommandsOpen((open) => !open);
        return;
      }
      if (isEditing || event.ctrlKey || event.metaKey || event.altKey || !projectId) return;

      const key = event.key.toLowerCase();
      if (gPressedAtRef.current !== null) {
        const isRecent = Date.now() - gPressedAtRef.current < 900;
        gPressedAtRef.current = null;
        if (isRecent && key === 'b') {
          navigate(`/projects/${projectId}/board`);
          return;
        }
      }
      if (key === 'g') {
        gPressedAtRef.current = Date.now();
      } else if (key === 'c' && pathname.endsWith('/backlog')) {
        navigate(`/projects/${projectId}/backlog`, { state: { openCreateTodo: true } });
      } else if (key === '/' && pathname.endsWith('/backlog')) {
        event.preventDefault();
        navigate(`/projects/${projectId}/backlog`, { state: { focusSearch: true } });
      } else if (key === '?') {
        setShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, pathname, projectId]);

  return (
    <div className="kb-app min-h-screen">
      {/* Tablet sidebar */}
      <Sidebar
        collapsed
        className="fixed inset-y-0 left-0 z-30 hidden w-16 md:flex lg:hidden"
      />

      {/* Desktop sidebar */}
      <Sidebar className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:flex" />

      {/* Mobile sidebar drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-kanbot-text/25 dark:bg-black/50"
            aria-hidden="true"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="kanbot-drawer-enter absolute inset-y-0 left-0 w-64 max-w-[80%]">
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="md:pl-16 lg:pl-64">
        <Topbar
          onOpenNav={() => setMobileNavOpen(true)}
          onOpenAI={() => setAiOpen(true)}
          onOpenCommands={() => setCommandsOpen(true)}
        />
        <main
          className={cn(
            'mx-auto w-full px-4 py-6 pb-24 sm:px-6 md:pb-6 lg:px-8',
            pathname.endsWith('/board') ? 'max-w-[1680px]' : 'max-w-6xl',
          )}
        >
          <Outlet />
        </main>
      </div>

      {projectId && <MobileNavigation projectId={projectId} />}
      {commandsOpen && (
        <CommandPalette
          open={commandsOpen}
          projectId={projectId}
          onClose={() => setCommandsOpen(false)}
        />
      )}
      <ShortcutHelpDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {aiOpen && (
        <Suspense fallback={null}>
          <ProjectAIConversation
            key={projectId ?? 'no-project'}
            projectId={projectId}
            open={aiOpen}
            onClose={() => {
              setAiOpen(false);
              setAiPrompt(null);
            }}
            prompt={aiPrompt}
          />
        </Suspense>
      )}
    </div>
  );
}

function readChatHistory(projectId: string | undefined): ChatMessage[] {
  if (!projectId) return [];
  try {
    const raw = window.localStorage.getItem(`kanbot:chat:${projectId}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError('Stored chat history must be an array.');
    return parsed
      .filter(
        (message): message is ChatMessage =>
          typeof message === 'object' &&
          message !== null &&
          'role' in message &&
          (message.role === 'user' || message.role === 'assistant') &&
          'content' in message &&
          typeof message.content === 'string',
      )
      .slice(-30);
  } catch (error) {
    console.error('Kanbot could not load the saved chat history.', error);
    return [];
  }
}

function writeChatHistory(projectId: string, messages: ChatMessage[]): void {
  try {
    if (messages.length === 0) {
      window.localStorage.removeItem(`kanbot:chat:${projectId}`);
      return;
    }
    window.localStorage.setItem(`kanbot:chat:${projectId}`, JSON.stringify(messages.slice(-30)));
  } catch (error) {
    console.error('Kanbot could not save the chat history in this browser.', error);
  }
}

function ProjectAIConversation({
  projectId,
  open,
  onClose,
  prompt,
}: {
  projectId: string | undefined;
  open: boolean;
  onClose: () => void;
  prompt: { key: number; text: string } | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readChatHistory(projectId));

  useEffect(() => {
    if (projectId) writeChatHistory(projectId, messages);
  }, [messages, projectId]);

  return (
    <AIDrawer
      key={prompt?.key ?? 'default'}
      open={open}
      onClose={onClose}
      projectId={projectId}
      messages={messages}
      onMessagesChange={setMessages}
      initialPrompt={prompt?.text}
    />
  );
}

function MobileNavigation({ projectId }: { projectId: string }) {
  const items = [
    { to: `/projects/${projectId}/backlog`, label: 'Backlog', icon: <BacklogIcon className="h-5 w-5" /> },
    { to: `/projects/${projectId}/board`, label: 'Board', icon: <BoardIcon className="h-5 w-5" /> },
    { to: `/projects/${projectId}/week`, label: 'My Week', icon: <CalendarIcon className="h-5 w-5" /> },
    { to: `/projects/${projectId}/sprints`, label: 'Sprints', icon: <SprintsIcon className="h-5 w-5" /> },
  ];

  return (
    <nav
      aria-label="Mobile project navigation"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-kanbot-border bg-kanbot-surface px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 dark:border-kanbot-dark-border dark:bg-kanbot-dark-surface md:hidden"
    >
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kanbot-primary',
              isActive
                ? 'text-kanbot-primary dark:text-kanbot-dark-primary'
                : 'text-kanbot-muted hover:text-kanbot-text dark:text-kanbot-dark-muted dark:hover:text-kanbot-dark-text',
            )
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
