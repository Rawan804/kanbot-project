import type { SVGProps, ReactElement } from 'react';
import type { TodoType } from '../../types/api';
import { BugIcon, BookOpenIcon, ClipboardIcon } from './icons';
import { cn } from '../lib/cn';

type IconComponent = (props: SVGProps<SVGSVGElement> & { title?: string }) => ReactElement | null;

interface TypeConfig {
  icon: IconComponent;
  label: string;
  className: string;
}

const typeConfig: Record<TodoType, TypeConfig> = {
  task: {
    icon: ClipboardIcon as IconComponent,
    label: 'Task',
    className: 'text-[color:var(--kb-sky-fg)]',
  },
  story: {
    icon: BookOpenIcon as IconComponent,
    label: 'Story',
    className: 'text-[color:var(--kb-lav-fg)]',
  },
  bug: {
    icon: BugIcon as IconComponent,
    label: 'Bug',
    className: 'text-[color:var(--kb-rose-fg)]',
  },
};

interface TypeIconProps {
  type: TodoType;
  /** Tailwind size classes for the icon. Default "h-4 w-4". */
  size?: string;
  showLabel?: boolean;
  className?: string;
}

export function TypeIcon({ type, size = 'h-4 w-4', showLabel = false, className }: TypeIconProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1', className)} title={config.label}>
      <Icon className={cn(size, config.className)} title={config.label} />
      {showLabel && <span className="text-xs text-[color:var(--kb-muted)]">{config.label}</span>}
    </span>
  );
}
