import type { SVGProps, ReactElement } from 'react';
import type { TodoPriority } from '../../types/api';
import { ArrowDownIcon, ArrowUpIcon, ZapIcon } from './icons';
import { cn } from '../lib/cn';

type IconComponent = (props: SVGProps<SVGSVGElement> & { title?: string }) => ReactElement | null;

interface PriorityConfig {
  label: string;
  icon: IconComponent;
  badge: string;
  iconClass: string;
}

const priorityConfig: Record<TodoPriority, PriorityConfig> = {
  low: {
    label: 'Low',
    icon: ArrowDownIcon as IconComponent,
    badge: 'bg-slate-100 text-slate-600',
    iconClass: 'text-slate-400',
  },
  medium: {
    label: 'Medium',
    icon: ArrowUpIcon as IconComponent,
    badge: 'bg-blue-50 text-blue-700',
    iconClass: 'text-blue-400',
  },
  high: {
    label: 'High',
    icon: ArrowUpIcon as IconComponent,
    badge: 'bg-amber-50 text-amber-700',
    iconClass: 'text-amber-500',
  },
  urgent: {
    label: 'Urgent',
    icon: ZapIcon as IconComponent,
    badge: 'bg-red-50 text-red-700',
    iconClass: 'text-red-500',
  },
};

interface PriorityBadgeProps {
  priority: TodoPriority;
  /** When true just show the icon without the text label (for compact rows). */
  iconOnly?: boolean;
  className?: string;
}

export function PriorityBadge({ priority, iconOnly = false, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  if (iconOnly) {
    return (
      <span title={config.label} className={cn('inline-flex items-center', className)}>
        <Icon className={cn('h-3.5 w-3.5', config.iconClass)} title={config.label} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4',
        config.badge,
        className,
      )}
    >
      <Icon className={cn('h-3 w-3 shrink-0', config.iconClass)} aria-hidden="true" />
      {config.label}
    </span>
  );
}
