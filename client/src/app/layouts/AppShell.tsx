import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router';
import type { ChatMessage } from '../../types/api';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AIDrawer } from './AIDrawer';
import { useSelectedProjectId } from '../hooks/useSelectedProjectId';

/**
 * AppShell owns the AI conversation state so the chat is preserved while
 * navigating between pages. The conversation resets when the user switches
 * to a different project.
 */
export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // Conversation is project-scoped: messages + the projectId they belong to.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const projectId = useSelectedProjectId();
  const prevProjectIdRef = useRef<string | undefined>(projectId);

  // Reset conversation when the user navigates to a different project.
  useEffect(() => {
    if (prevProjectIdRef.current !== projectId) {
      prevProjectIdRef.current = projectId;
      setMessages([]);
    }
  }, [projectId]);

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-900">
      {/* Desktop sidebar */}
      <Sidebar className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:flex" />

      {/* Mobile sidebar drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            aria-hidden="true"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[80%]">
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <Topbar
          onOpenNav={() => setMobileNavOpen(true)}
          onOpenAI={() => setAiOpen(true)}
        />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <AIDrawer
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        projectId={projectId}
        messages={messages}
        onMessagesChange={setMessages}
      />
    </div>
  );
}
