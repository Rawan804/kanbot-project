import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useProjects } from '../../features/projects/hooks/useProjects';
import { ChevronDownIcon, CheckIcon, PlusIcon } from '../../shared/components/icons';
import { useSelectedProjectId } from '../hooks/useSelectedProjectId';

interface Props {
  onNavigate?: () => void;
}
export function ProjectSwitcher({ onNavigate }: Props) {
  const projectId = useSelectedProjectId();
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = projects?.find((p) => p.id === projectId);
  // Close on outside click / Escape while the menu is open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const go = (id: string) => {
    setOpen(false);
    onNavigate?.();
    navigate(`/projects/${id}/backlog`);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4bff]"
      >
        <span className="truncate font-medium">
          {current ? current.name : 'Select a project'}
        </span>
        {current && (
          <span className="ml-auto shrink-0 rounded-md bg-[#2f4bff]/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-200">
            {current.key}
          </span>
        )}
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch project"
          className="absolute left-0 z-50 mt-1.5 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-2xl"
        >
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Your projects
          </p>
          <div className="max-h-64 overflow-y-auto" data-lenis-prevent>
            {isLoading && (
              <p className="px-3 py-2 text-sm text-slate-400">Loading…</p>
            )}
            {!isLoading && projects?.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-400">No projects yet.</p>
            )}
            {projects?.map((p) => {
              const active = p.id === projectId;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="menuitem"
                  onClick={() => go(p.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                >
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-[#eef1ff] px-1.5 text-[10px] font-bold tracking-wide text-[#2f4bff]">
                    {p.key}
                  </span>
                  <span className={active ? 'font-medium text-slate-900' : 'text-slate-700'}>
                    {p.name}
                  </span>
                  {active && <CheckIcon className="ml-auto h-4 w-4 text-[#2f4bff]" />}
                </button>
              );
            })}
          </div>
          <div className="mt-1 border-t border-slate-100 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
                navigate('/projects');
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              <PlusIcon className="h-4 w-4 text-slate-400" />
              All projects
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
